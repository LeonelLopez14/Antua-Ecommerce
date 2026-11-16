import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Not } from 'typeorm';
import { Cart } from 'src/cart/entities/cart.entity';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import { Order } from 'src/orders/entities/order.entity';
import { AuditService } from '../audit.service';
import { pageParams, toPage } from '../dto/page-query.dto';
import type { RemovalResult } from '../catalog/admin-products.service';
import {
  CouponQueryDto,
  CouponStatus,
  CreateCouponDto,
  UpdateCouponDto,
} from './admin-coupon.dto';

type Actor = { id: number };

/** Para detectar qué cambió: los decimales llegan como string desde MySQL y las fechas como Date. */
const comparable = (value: unknown): string | number | boolean | null => {
  if (value instanceof Date) return value.getTime();
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string')
    return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  return JSON.stringify(value);
};

interface CouponRules {
  discount_type: string;
  discount_value: number;
  valid_from: Date;
  valid_until: Date;
}

const TIMESTAMP_MIN = new Date('1971-01-01T00:00:00Z');
const TIMESTAMP_MAX = new Date('2037-12-31T23:59:59Z');

/** Reglas que cruzan campos. Pura: se prueba sin base. Devuelve los errores en castellano. */
export function couponRuleErrors(rules: CouponRules): string[] {
  const errors: string[] = [];
  const value = Number(rules.discount_value);
  if (rules.discount_type === 'percentage' && (value < 1 || value > 100)) {
    errors.push('El porcentaje tiene que estar entre 1 y 100.');
  }
  if (
    Number.isNaN(rules.valid_from.getTime()) ||
    Number.isNaN(rules.valid_until.getTime())
  ) {
    errors.push('Las fechas no son válidas.');
  } else {
    if (rules.valid_until <= rules.valid_from) {
      errors.push('La fecha de fin tiene que ser posterior a la de inicio.');
    }
    // Las columnas son TIMESTAMP de MySQL: no admiten fechas después de enero de 2038.
    if (rules.valid_from < TIMESTAMP_MIN || rules.valid_until > TIMESTAMP_MAX) {
      errors.push('Las fechas tienen que estar entre 1971 y 2037.');
    }
  }
  return errors;
}

/** Estado que ve el panel. El orden importa: inactivo gana sobre vencido, etc. */
export function couponStatus(coupon: Coupon, now = new Date()): CouponStatus {
  if (!coupon.is_active) return 'inactive';
  if (coupon.valid_from > now) return 'scheduled';
  if (coupon.valid_until < now) return 'expired';
  if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit)
    return 'exhausted';
  return 'active';
}

const STATUS_SQL: Record<CouponStatus, string> = {
  inactive: 'c.is_active = 0',
  scheduled: 'c.is_active = 1 AND c.valid_from > :now',
  expired: 'c.is_active = 1 AND c.valid_from <= :now AND c.valid_until < :now',
  exhausted:
    'c.is_active = 1 AND c.valid_from <= :now AND c.valid_until >= :now AND c.usage_limit IS NOT NULL AND c.times_used >= c.usage_limit',
  active:
    'c.is_active = 1 AND c.valid_from <= :now AND c.valid_until >= :now AND (c.usage_limit IS NULL OR c.times_used < c.usage_limit)',
};

@Injectable()
export class AdminCouponsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  private toView(coupon: Coupon) {
    return {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order_amount:
        coupon.min_order_amount === null
          ? null
          : Number(coupon.min_order_amount),
      usage_limit: coupon.usage_limit,
      times_used: coupon.times_used,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      is_active: coupon.is_active,
      status: couponStatus(coupon),
    };
  }

  async findPage(query: CouponQueryDto) {
    const { page, limit, skip } = pageParams(query);
    const qb = this.dataSource
      .getRepository(Coupon)
      .createQueryBuilder('c')
      .orderBy('c.valid_until', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip(skip)
      .take(limit);
    if (query.q)
      qb.andWhere('c.code LIKE :q', {
        q: `%${query.q.replace(/[\\%_]/g, '\\$&')}%`,
      });
    if (query.status)
      qb.andWhere(STATUS_SQL[query.status], { now: new Date() });
    const [rows, total] = await qb.getManyAndCount();
    return toPage(
      rows.map((coupon) => this.toView(coupon)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: number) {
    const coupon = await this.dataSource
      .getRepository(Coupon)
      .findOneBy({ id });
    if (!coupon) throw new NotFoundException('Cupón no encontrado.');
    return this.toView(coupon);
  }

  async create(dto: CreateCouponDto, actor: Actor) {
    const values = {
      code: dto.code,
      discount_type: dto.discount_type,
      discount_value: dto.discount_value,
      min_order_amount: dto.min_order_amount ?? null,
      usage_limit: dto.usage_limit ?? null,
      valid_from: new Date(dto.valid_from),
      valid_until: new Date(dto.valid_until),
      is_active: dto.is_active ?? true,
    };
    this.assertRules(values);

    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Coupon);
      if (await repo.existsBy({ code: values.code })) {
        throw new ConflictException(
          `Ya existe un cupón con el código ${values.code}.`,
        );
      }
      const coupon = await repo.save(repo.create({ ...values, times_used: 0 }));
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'coupon.create',
          entity: 'coupon',
          entityId: coupon.id,
          changes: { ...values },
        },
        manager,
      );
      return coupon.id;
    });
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateCouponDto, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Coupon);
      const coupon = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coupon) throw new NotFoundException('Cupón no encontrado.');

      const next = {
        code: dto.code ?? coupon.code,
        discount_type: dto.discount_type ?? coupon.discount_type,
        discount_value: dto.discount_value ?? Number(coupon.discount_value),
        min_order_amount:
          dto.min_order_amount === undefined
            ? coupon.min_order_amount === null
              ? null
              : Number(coupon.min_order_amount)
            : dto.min_order_amount,
        usage_limit:
          dto.usage_limit === undefined ? coupon.usage_limit : dto.usage_limit,
        valid_from: dto.valid_from
          ? new Date(dto.valid_from)
          : coupon.valid_from,
        valid_until: dto.valid_until
          ? new Date(dto.valid_until)
          : coupon.valid_until,
        is_active: dto.is_active ?? coupon.is_active,
      };
      this.assertRules(next);
      if (
        next.code !== coupon.code &&
        (await repo.existsBy({ code: next.code, id: Not(id) }))
      ) {
        throw new ConflictException(
          `Ya existe un cupón con el código ${next.code}.`,
        );
      }

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        if (comparable(coupon[key]) !== comparable(next[key])) {
          before[key] = coupon[key];
          after[key] = next[key];
        }
      }
      if (Object.keys(after).length === 0) return;
      await repo.update(id, next);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'coupon.update',
          entity: 'coupon',
          entityId: id,
          changes: { before, after },
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  /** Un cupón usado (o aplicado en un carrito) no se borra: se desactiva y se explica. */
  async remove(id: number, actor: Actor): Promise<RemovalResult> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Coupon);
      const coupon = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coupon) throw new NotFoundException('Cupón no encontrado.');

      const used =
        coupon.times_used > 0 ||
        (await manager.getRepository(Order).existsBy({ coupon: { id } })) ||
        (await manager.getRepository(Cart).existsBy({ coupon: { id } }));

      if (used) {
        await repo.update(id, { is_active: false });
        await this.audit.record(
          {
            adminId: actor.id,
            action: 'coupon.deactivate',
            entity: 'coupon',
            entityId: id,
            changes: { code: coupon.code, reason: 'used' },
          },
          manager,
        );
        return {
          deleted: false,
          deactivated: true,
          message:
            'El cupón ya se usó o está aplicado en un carrito: se desactivó en lugar de borrarse, para conservar el historial.',
        };
      }
      await repo.delete(id);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'coupon.delete',
          entity: 'coupon',
          entityId: id,
          changes: { code: coupon.code },
        },
        manager,
      );
      return {
        deleted: true,
        deactivated: false,
        message: 'Cupón borrado: nunca se había usado.',
      };
    });
  }

  private assertRules(rules: CouponRules) {
    const errors = couponRuleErrors(rules);
    if (errors.length > 0) throw new BadRequestException(errors);
  }
}

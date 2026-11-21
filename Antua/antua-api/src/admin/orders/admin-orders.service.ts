import { OrderNotificationsService } from 'src/notifications/order-notifications.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { addDays, startOfStoreDay } from 'src/common/store-time';
import { OrderStatusHistory } from 'src/orders/entities/order-status-history.entity';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { releaseOrderReservation } from 'src/orders/order-reservation';
import { allowedTransitions, transitionError } from 'src/orders/order-status';
import { Payment } from 'src/payments/entities/payment.entity';
import { isPayableStatus, PaymentStatus } from 'src/payments/payment-state';
import { AuditService } from '../audit.service';
import { pageParams, toPage } from '../dto/page-query.dto';
import { AdminOrderQueryDto } from './admin-order.dto';

type Actor = { id: number };

const toNumber = (value: unknown): number => Number(value);

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly notifications: OrderNotificationsService,
  ) {}

  async findPage(query: AdminOrderQueryDto) {
    const { page, limit, skip } = pageParams(query);
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'La fecha "desde" tiene que ser anterior o igual a "hasta".',
      );
    }

    const qb = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('o')
      .leftJoin('o.user', 'u')
      .select([
        'o.id',
        'o.created_at',
        'o.status',
        'o.payment_status',
        'o.total',
        'o.shipping_full_name',
        'o.guest_email',
        'u.id',
        'u.email',
      ])
      .orderBy('o.created_at', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status)
      qb.andWhere('o.status = :status', { status: query.status });
    if (query.payment_status)
      qb.andWhere('o.payment_status = :ps', { ps: query.payment_status });
    if (query.from)
      qb.andWhere('o.created_at >= :from', {
        from: startOfStoreDay(query.from),
      });
    if (query.to)
      qb.andWhere('o.created_at < :to', {
        to: startOfStoreDay(addDays(query.to, 1)),
      });
    if (query.q) {
      const number = /^#?\d+$/.test(query.q)
        ? Number(query.q.replace('#', ''))
        : null;
      const like = `%${query.q.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        number !== null
          ? '(o.id = :number OR o.guest_email LIKE :like OR u.email LIKE :like)'
          : '(o.guest_email LIKE :like OR u.email LIKE :like)',
        { number, like },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    const counts = await this.unitCounts(rows.map((order) => order.id));
    const items = rows.map((order) => ({
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      payment_status: order.payment_status,
      total: toNumber(order.total),
      customer: order.shipping_full_name,
      email: order.user?.email ?? order.guest_email,
      isGuest: !order.user,
      units: counts.get(order.id) ?? 0,
    }));
    return toPage(items, total, page, limit);
  }

  /** Unidades por pedido, en una sola consulta agrupada para toda la página. */
  private async unitCounts(orderIds: number[]): Promise<Map<number, number>> {
    if (orderIds.length === 0) return new Map();
    const rows = await this.dataSource.query<
      { orderId: number; units: string }[]
    >(
      'SELECT orderId, SUM(quantity) AS units FROM order_items WHERE orderId IN (?) GROUP BY orderId',
      [orderIds],
    );
    return new Map(rows.map((row) => [Number(row.orderId), Number(row.units)]));
  }

  async findOne(id: number) {
    const order = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('o')
      .addSelect('o.internal_note')
      .leftJoin('o.user', 'u')
      .addSelect(['u.id', 'u.full_name', 'u.email'])
      .leftJoinAndSelect('o.coupon', 'c')
      .leftJoinAndSelect('o.items', 'i')
      .leftJoin('i.variant', 'v')
      .addSelect(['v.id', 'v.name', 'v.sku'])
      .where('o.id = :id', { id })
      .getOne();
    if (!order) throw new NotFoundException('Pedido no encontrado.');

    const [payments, history] = await Promise.all([
      this.dataSource.getRepository(Payment).find({
        where: { order: { id } },
        order: { created_at: 'DESC' },
      }),
      this.dataSource.getRepository(OrderStatusHistory).find({
        where: { order: { id } },
        relations: { changed_by: true },
        order: { created_at: 'DESC', id: 'DESC' },
      }),
    ]);

    return {
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      allowedTransitions: allowedTransitions(order),
      payment: {
        status: order.payment_status,
        expires_at: order.payment_expires_at,
        // Solo lectura: lo que informó el proveedor. Sin datos del pagador.
        attempts: payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          status: payment.status,
          amount: payment.amount === null ? null : toNumber(payment.amount),
          currency: payment.currency,
          created_at: payment.created_at,
          paid_at: payment.paid_at,
        })),
      },
      contact: {
        email: order.user?.email ?? order.guest_email,
        isGuest: !order.user,
        userId: order.user?.id ?? null,
        name: order.shipping_full_name,
        phone: order.shipping_phone,
      },
      shipping: {
        full_name: order.shipping_full_name,
        street: order.shipping_street,
        city: order.shipping_city,
        postal_code: order.shipping_postal_code,
        eta_days: order.shipping_eta_days,
      },
      items: order.items.map((item) => ({
        id: item.id,
        product_name: item.product_name_snapshot,
        variant: item.variant
          ? {
              id: item.variant.id,
              name: item.variant.name,
              sku: item.variant.sku,
            }
          : null,
        unit_price: toNumber(item.unit_price_snapshot),
        quantity: item.quantity,
      })),
      coupon: order.coupon
        ? { id: order.coupon.id, code: order.coupon.code }
        : null,
      totals: {
        subtotal: toNumber(order.subtotal),
        discount: toNumber(order.discount_amount),
        shipping: toNumber(order.shipping_amount),
        total: toNumber(order.total),
      },
      internal_note: order.internal_note,
      history: history.map((entry) => ({
        id: entry.id,
        from: entry.from_status,
        to: entry.to_status,
        created_at: entry.created_at,
        by: entry.changed_by
          ? { id: entry.changed_by.id, name: entry.changed_by.full_name }
          : null,
      })),
    };
  }

  /**
   * Cambia el estado logístico. Nunca toca precios ni totales.
   * Cancelar devuelve el stock y el uso del cupón con la misma función que el vencimiento de pagos.
   */
  async changeStatus(id: number, to: OrderStatus, actor: Actor) {
    const refundRequired = await this.dataSource.transaction(
      async (manager) => {
        const orders = manager.getRepository(Order);
        // Fila bloqueada: el webhook de pago o el vencimiento esperan a que termine.
        const order = await orders.findOne({
          where: { id },
          relations: { coupon: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Pedido no encontrado.');

        const error = transitionError(order, to);
        if (error) {
          throw new ConflictException({
            statusCode: 409,
            code: 'INVALID_TRANSITION',
            message: error,
          });
        }

        const changes: Partial<Order> = { status: to };
        let refund = false;
        if (to === OrderStatus.CANCELED) {
          await releaseOrderReservation(manager, order);
          if (isPayableStatus(order.payment_status)) {
            // Igual que el vencimiento: si después llega un pago aprobado, queda como paid_after_cancel.
            changes.payment_status = PaymentStatus.CANCELED;
          } else if (order.payment_status === PaymentStatus.PAID) {
            // El panel no devuelve dinero: hay que hacerlo en Mercado Pago.
            refund = true;
          }
        }

        await orders.update(id, changes);
        await manager.getRepository(OrderStatusHistory).insert({
          order: { id },
          from_status: order.status,
          to_status: to,
          changed_by: { id: actor.id },
        });
        await this.audit.record(
          {
            adminId: actor.id,
            action: 'order.status',
            entity: 'order',
            entityId: id,
            changes: {
              from: order.status,
              to,
              ...(changes.payment_status
                ? { payment_status: changes.payment_status }
                : {}),
            },
          },
          manager,
        );
        return refund;
      },
    );

    // Con el cambio ya guardado: avisa al cliente sin esperar (un correo que falla no lo revierte).
    void this.notifications.statusChanged(id, to, refundRequired);

    return {
      ...(await this.findOne(id)),
      ...(refundRequired
        ? {
            notice:
              'El pedido estaba pagado: devolvé el pago desde Mercado Pago. El stock y el cupón ya se liberaron.',
          }
        : {}),
    };
  }

  async updateNote(id: number, note: string, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(Order);
      if (!(await orders.existsBy({ id })))
        throw new NotFoundException('Pedido no encontrado.');
      await orders.update(id, { internal_note: note === '' ? null : note });
      // Solo el largo: la nota puede tener datos del cliente y la auditoría no los necesita.
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'order.note',
          entity: 'order',
          entityId: id,
          changes: { length: note.length },
        },
        manager,
      );
    });
    return this.findOne(id);
  }
}

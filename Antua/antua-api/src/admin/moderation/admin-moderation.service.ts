import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Review } from 'src/reviews/entities/review.entity';
import { AuditService } from '../audit.service';
import { pageParams, toPage } from '../dto/page-query.dto';
import { AdminReviewQueryDto, AdminUserQueryDto } from './moderation.dto';

type Actor = { id: number };
const escapeLike = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class AdminModerationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async findReviews(query: AdminReviewQueryDto) {
    const { page, limit, skip } = pageParams(query);
    const qb = this.dataSource
      .getRepository(Review)
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .addSelect(['p.id', 'p.name', 'p.slug'])
      .innerJoin('r.user', 'u')
      .addSelect(['u.id', 'u.full_name'])
      .orderBy('r.created_at', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .skip(skip)
      .take(limit);
    if (query.q)
      qb.andWhere('(p.name LIKE :q OR r.comment LIKE :q)', {
        q: escapeLike(query.q),
      });
    if (query.rating)
      qb.andWhere('r.rating = :rating', { rating: query.rating });
    if (query.hidden !== undefined)
      qb.andWhere('r.is_hidden = :hidden', { hidden: query.hidden });

    const [rows, total] = await qb.getManyAndCount();
    const items = rows.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      is_hidden: review.is_hidden,
      created_at: review.created_at,
      product: {
        id: review.product.id,
        name: review.product.name,
        slug: review.product.slug,
      },
      author: { id: review.user.id, name: review.user.full_name },
    }));
    return toPage(items, total, page, limit);
  }

  /** Ocultar es reversible y es lo recomendado. El promedio público se recalcula solo: se calcula sobre las visibles. */
  async setReviewHidden(id: number, hidden: boolean, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Review);
      const review = await repo.findOne({
        where: { id },
        relations: { product: true },
      });
      if (!review) throw new NotFoundException('Reseña no encontrada.');
      if (review.is_hidden === hidden) return;
      await repo.update(id, { is_hidden: hidden });
      await this.audit.record(
        {
          adminId: actor.id,
          action: hidden ? 'review.hide' : 'review.show',
          entity: 'review',
          entityId: id,
          changes: { productId: review.product.id },
        },
        manager,
      );
    });
    return { id, is_hidden: hidden };
  }

  async removeReview(id: number, actor: Actor) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Review);
      const review = await repo.findOne({
        where: { id },
        relations: { product: true },
      });
      if (!review) throw new NotFoundException('Reseña no encontrada.');
      await repo.delete(id);
      await this.audit.record(
        {
          adminId: actor.id,
          action: 'review.delete',
          entity: 'review',
          entityId: id,
          changes: { productId: review.product.id, rating: review.rating },
        },
        manager,
      );
    });
    return { deleted: true, message: 'Reseña borrada. No se puede deshacer.' };
  }

  /**
   * Usuarios en SOLO lectura. La consulta elige las columnas una por una: nunca el hash de la
   * contraseña ni tokens, aunque mañana se agregue una columna sensible a la entidad.
   */
  async findUsers(query: AdminUserQueryDto) {
    const { page, limit, skip } = pageParams(query);
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.q) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(escapeLike(query.q), escapeLike(query.q));
    }
    if (query.role) {
      where.push('u.role = ?');
      params.push(query.role);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await this.dataSource.query<{ total: string }[]>(
      `SELECT COUNT(*) AS total FROM users u ${filter}`,
      params,
    );
    const rows = await this.dataSource.query<
      {
        id: number;
        full_name: string;
        email: string;
        role: string;
        created_at: Date;
        orders: string;
      }[]
    >(
      `SELECT u.id, u.full_name, u.email, u.role, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.userId = u.id) AS orders
       FROM users u ${filter}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, skip],
    );
    return toPage(
      rows.map((row) => ({
        ...row,
        id: Number(row.id),
        orders: Number(row.orders),
      })),
      Number(total),
      page,
      limit,
    );
  }
}

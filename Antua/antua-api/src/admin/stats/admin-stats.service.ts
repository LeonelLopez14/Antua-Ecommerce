import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  addDays,
  mysqlOffset,
  startOfStoreDay,
  storeDate,
  storeOffsetMinutes,
} from 'src/common/store-time';

const SERIES_DAYS = 30;

interface PeriodRow {
  orders_today: string;
  revenue_today: string | null;
  orders_7d: string;
  revenue_7d: string | null;
  orders_30d: string;
  revenue_30d: string | null;
  pending_payment: string;
  to_prepare: string;
  preparing: string;
}

/** Rellena con ceros los días sin pedidos, para que el gráfico tenga los 30 días. */
export function fillDailySeries(
  rows: { day: string; orders: number; revenue: number }[],
  lastDay: string,
  days = SERIES_DAYS,
) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(lastDay, index - days + 1);
    return byDay.get(day) ?? { day, orders: 0, revenue: 0 };
  });
}

/**
 * Resumen del panel. Todo se agrega en MySQL (SUM/COUNT/GROUP BY): nunca se traen los pedidos.
 * "Ventas" = pedidos no cancelados. Los períodos empiezan a la medianoche de Montevideo.
 */
@Injectable()
export class AdminStatsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async summary(now = new Date()) {
    const today = storeDate(now);
    const startToday = startOfStoreDay(today);
    const start7 = startOfStoreDay(addDays(today, -6));
    const start30 = startOfStoreDay(addDays(today, -(SERIES_DAYS - 1)));
    const lowStock = this.config.getOrThrow<number>('LOW_STOCK_THRESHOLD');
    const offset = mysqlOffset(storeOffsetMinutes(now));

    const [periods] = await this.dataSource.query<PeriodRow[]>(
      `SELECT
         SUM(o.created_at >= ? AND o.status <> 'canceled') AS orders_today,
         SUM(CASE WHEN o.created_at >= ? AND o.status <> 'canceled' THEN o.total END) AS revenue_today,
         SUM(o.created_at >= ? AND o.status <> 'canceled') AS orders_7d,
         SUM(CASE WHEN o.created_at >= ? AND o.status <> 'canceled' THEN o.total END) AS revenue_7d,
         SUM(o.created_at >= ? AND o.status <> 'canceled') AS orders_30d,
         SUM(CASE WHEN o.created_at >= ? AND o.status <> 'canceled' THEN o.total END) AS revenue_30d,
         (SELECT COUNT(*) FROM orders p WHERE p.status = 'pending'
            AND p.payment_status IN ('pending', 'failed') AND p.payment_expires_at IS NOT NULL) AS pending_payment,
         (SELECT COUNT(*) FROM orders p WHERE p.status = 'pending'
            AND (p.payment_status = 'paid' OR (p.payment_expires_at IS NULL AND p.payment_status = 'pending'))) AS to_prepare,
         (SELECT COUNT(*) FROM orders p WHERE p.status = 'preparing') AS preparing
       FROM orders o
       WHERE o.created_at >= ?`,
      [startToday, startToday, start7, start7, start30, start30, start30],
    );

    const daily = await this.dataSource.query<
      { day: string; orders: string; revenue: string }[]
    >(
      `SELECT DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', ?), '%Y-%m-%d') AS day,
              COUNT(*) AS orders, SUM(total) AS revenue
       FROM orders
       WHERE created_at >= ? AND status <> 'canceled'
       GROUP BY day`,
      [offset, start30],
    );

    const topProducts = await this.dataSource.query<
      { productId: number; name: string; units: string; revenue: string }[]
    >(
      `SELECT v.productId AS productId, p.name AS name,
              SUM(i.quantity) AS units, SUM(i.quantity * i.unit_price_snapshot) AS revenue
       FROM order_items i
       INNER JOIN orders o ON o.id = i.orderId
       INNER JOIN product_variants v ON v.id = i.variantId
       INNER JOIN products p ON p.id = v.productId
       WHERE o.created_at >= ? AND o.status <> 'canceled'
       GROUP BY v.productId, p.name
       ORDER BY units DESC, revenue DESC
       LIMIT 5`,
      [start30],
    );

    const lowStockVariants = await this.dataSource.query<
      {
        variantId: number;
        productId: number;
        product: string;
        name: string;
        stock: number;
      }[]
    >(
      `SELECT v.id AS variantId, p.id AS productId, p.name AS product, v.name AS name, v.stock AS stock
       FROM product_variants v
       INNER JOIN products p ON p.id = v.productId
       WHERE v.is_active = 1 AND p.is_active = 1 AND v.stock <= ?
       ORDER BY v.stock ASC, p.name ASC
       LIMIT 10`,
      [lowStock],
    );

    const [reviews] = await this.dataSource.query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM reviews WHERE created_at >= ?',
      [start7],
    );
    const latestReviews = await this.dataSource.query<
      {
        id: number;
        rating: number;
        product: string;
        created_at: Date;
        is_hidden: number;
      }[]
    >(
      `SELECT r.id, r.rating, p.name AS product, r.created_at, r.is_hidden
       FROM reviews r INNER JOIN products p ON p.id = r.productId
       ORDER BY r.created_at DESC, r.id DESC LIMIT 5`,
    );

    const num = (value: string | null | undefined) => Number(value ?? 0);
    return {
      timeZone: 'America/Montevideo',
      today,
      periods: {
        today: {
          orders: num(periods.orders_today),
          revenue: num(periods.revenue_today),
        },
        last7Days: {
          orders: num(periods.orders_7d),
          revenue: num(periods.revenue_7d),
        },
        last30Days: {
          orders: num(periods.orders_30d),
          revenue: num(periods.revenue_30d),
        },
      },
      queues: {
        pendingPayment: num(periods.pending_payment),
        toPrepare: num(periods.to_prepare),
        preparing: num(periods.preparing),
      },
      daily: fillDailySeries(
        daily.map((row) => ({
          day: row.day,
          orders: num(row.orders),
          revenue: num(row.revenue),
        })),
        today,
      ),
      topProducts: topProducts.map((row) => ({
        productId: Number(row.productId),
        name: row.name,
        units: num(row.units),
        revenue: num(row.revenue),
      })),
      lowStock: {
        threshold: lowStock,
        variants: lowStockVariants.map((row) => ({
          ...row,
          stock: Number(row.stock),
        })),
      },
      reviews: {
        last7Days: num(reviews.total),
        latest: latestReviews.map((row) => ({
          ...row,
          is_hidden: Boolean(row.is_hidden),
        })),
      },
    };
  }
}

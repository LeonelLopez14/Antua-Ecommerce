import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { Readable, Transform } from 'node:stream';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { addDays, startOfStoreDay, storeDate } from 'src/common/store-time';
import { Order } from 'src/orders/entities/order.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import type { User } from 'src/users/entities/user.entity';
import { AuditService } from '../audit.service';
import type {
  ExportFormatDto,
  ExportOrdersQueryDto,
} from './admin-exports.dto';
import {
  BOM,
  boolCell,
  numberCell,
  row,
  storeIso,
  textCell,
  type Separator,
} from './csv';

/** Tope de filas por archivo: más que eso se pide acotar el rango (memoria, tiempo y datos expuestos). */
export const EXPORT_MAX_ROWS = 10_000;
/** Rango máximo de días por exportación de pedidos. */
export const EXPORT_MAX_DAYS = 366;

export interface CsvExport {
  filename: string;
  rows: number;
  stream: Readable;
}

/** Fila cruda de la exportación de pedidos (alias de la consulta). */
interface OrderRow {
  id: number;
  created_at: Date | string;
  status: string;
  payment_status: string;
  is_guest: number | string;
  customer: string;
  city: string;
  postal_code: string;
  units: number | string | null;
  coupon: string | null;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}

interface VariantRow {
  product_id: number;
  slug: string;
  product: string;
  product_active: number | string;
  variant_id: number;
  sku: string;
  variant: string;
  price: string;
  stock: number | string;
  variant_active: number | string;
}

const ORDER_HEADER = [
  'pedido',
  'fecha_montevideo',
  'estado',
  'estado_pago',
  'invitado',
  'cliente',
  'ciudad',
  'codigo_postal',
  'unidades',
  'cupon',
  'subtotal',
  'descuento',
  'envio',
  'total',
  'moneda',
];

const VARIANT_HEADER = [
  'producto_id',
  'slug',
  'producto',
  'producto_activo',
  'variante_id',
  'sku',
  'variante',
  'precio',
  'moneda',
  'stock',
  'variante_activa',
  'stock_bajo',
];

/**
 * Exportaciones CSV del panel. Primero se cuenta (y se rechaza si pasa el tope), después se
 * registra en la auditoría quién exportó qué y cuántas filas, y recién ahí se manda el archivo
 * en streaming: las filas salen de MySQL de a una y nunca se cargan todas en memoria.
 *
 * Datos personales mínimos: de los pedidos sale el nombre, la ciudad y el código postal (para
 * preparar y despachar), sin email, teléfono ni calle. Nunca hashes ni tokens.
 */
@Injectable()
export class AdminExportsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async orders(query: ExportOrdersQueryDto, admin: User): Promise<CsvExport> {
    if (query.from > query.to) {
      throw new BadRequestException(
        'La fecha "desde" tiene que ser anterior o igual a "hasta".',
      );
    }
    if (query.to > addDays(query.from, EXPORT_MAX_DAYS - 1)) {
      throw new BadRequestException(
        `El rango máximo es de ${EXPORT_MAX_DAYS} días.`,
      );
    }
    const separator = separatorOf(query.separator);
    const filtered = (qb: SelectQueryBuilder<Order>) => {
      qb.where('o.created_at >= :from', {
        from: startOfStoreDay(query.from),
      }).andWhere('o.created_at < :to', {
        to: startOfStoreDay(addDays(query.to, 1)),
      });
      if (query.status)
        qb.andWhere('o.status = :status', { status: query.status });
      if (query.payment_status)
        qb.andWhere('o.payment_status = :ps', { ps: query.payment_status });
      return qb;
    };

    const repository = this.dataSource.getRepository(Order);
    const rows = await filtered(repository.createQueryBuilder('o')).getCount();
    assertWithinLimit(
      rows,
      'pedidos',
      'Acotá el rango de fechas o los filtros.',
    );

    await this.audit.record({
      adminId: admin.id,
      action: 'export.orders',
      entity: 'order',
      entityId: null,
      changes: {
        from: query.from,
        to: query.to,
        status: query.status ?? null,
        payment_status: query.payment_status ?? null,
        separator,
        rows,
      },
    });

    const qb = filtered(repository.createQueryBuilder('o'))
      .leftJoin('o.coupon', 'c')
      .select('o.id', 'id')
      .addSelect('o.created_at', 'created_at')
      .addSelect('o.status', 'status')
      .addSelect('o.payment_status', 'payment_status')
      .addSelect('CASE WHEN o.userId IS NULL THEN 1 ELSE 0 END', 'is_guest')
      .addSelect('o.shipping_full_name', 'customer')
      .addSelect('o.shipping_city', 'city')
      .addSelect('o.shipping_postal_code', 'postal_code')
      .addSelect(
        '(SELECT SUM(i.quantity) FROM order_items i WHERE i.orderId = o.id)',
        'units',
      )
      .addSelect('c.code', 'coupon')
      .addSelect('o.subtotal', 'subtotal')
      .addSelect('o.discount_amount', 'discount')
      .addSelect('o.shipping_amount', 'shipping')
      .addSelect('o.total', 'total')
      .orderBy('o.created_at', 'ASC')
      .addOrderBy('o.id', 'ASC');

    const currency = this.currency;
    return {
      filename: `pedidos_${query.from}_${query.to}.csv`,
      rows,
      stream: await csvStream(qb, ORDER_HEADER, separator, (r: OrderRow) => [
        numberCell(r.id, 0),
        storeIso(r.created_at),
        textCell(r.status, separator),
        textCell(r.payment_status, separator),
        boolCell(Number(r.is_guest)),
        textCell(r.customer, separator),
        textCell(r.city, separator),
        textCell(r.postal_code, separator),
        numberCell(r.units ?? 0, 0),
        textCell(r.coupon, separator),
        numberCell(r.subtotal),
        numberCell(r.discount),
        numberCell(r.shipping),
        numberCell(r.total),
        currency,
      ]),
    };
  }

  async products(format: ExportFormatDto, admin: User): Promise<CsvExport> {
    const separator = separatorOf(format.separator);
    const repository = this.dataSource.getRepository(ProductVariant);
    const rows = await repository.count();
    assertWithinLimit(
      rows,
      'variantes',
      'Pedí ayuda para exportar un catálogo tan grande.',
    );

    await this.audit.record({
      adminId: admin.id,
      action: 'export.products',
      entity: 'product',
      entityId: null,
      changes: { separator, rows },
    });

    const lowStock = this.config.getOrThrow<number>('LOW_STOCK_THRESHOLD');
    const qb = repository
      .createQueryBuilder('v')
      .innerJoin('v.product', 'p')
      .select('p.id', 'product_id')
      .addSelect('p.slug', 'slug')
      .addSelect('p.name', 'product')
      .addSelect('p.is_active', 'product_active')
      .addSelect('v.id', 'variant_id')
      .addSelect('v.sku', 'sku')
      .addSelect('v.name', 'variant')
      .addSelect('v.price', 'price')
      .addSelect('v.stock', 'stock')
      .addSelect('v.is_active', 'variant_active')
      .orderBy('p.name', 'ASC')
      .addOrderBy('v.id', 'ASC');

    const currency = this.currency;
    return {
      filename: `productos_${storeDate(new Date())}.csv`,
      rows,
      stream: await csvStream(
        qb,
        VARIANT_HEADER,
        separator,
        (r: VariantRow) => [
          numberCell(r.product_id, 0),
          textCell(r.slug, separator),
          textCell(r.product, separator),
          boolCell(Number(r.product_active)),
          numberCell(r.variant_id, 0),
          textCell(r.sku, separator),
          textCell(r.variant, separator),
          numberCell(r.price),
          currency,
          numberCell(r.stock, 0),
          boolCell(Number(r.variant_active)),
          boolCell(Number(r.stock) <= lowStock),
        ],
      ),
    };
  }

  private get currency(): string {
    return 'UYU';
  }
}

const separatorOf = (value: 'semicolon' | 'comma' | undefined): Separator =>
  value === 'comma' ? ',' : ';';

export function assertWithinLimit(
  rows: number,
  what: string,
  hint: string,
): void {
  if (rows > EXPORT_MAX_ROWS) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      code: 'EXPORT_TOO_LARGE',
      message: `Son ${rows} ${what}; el máximo por archivo es ${EXPORT_MAX_ROWS}. ${hint}`,
    });
  }
}

/**
 * BOM + encabezado + una fila por cada registro que llega de MySQL. El Transform convierte cada
 * fila en texto CSV a medida que llega, sin juntarlas.
 */
async function csvStream<T>(
  qb: SelectQueryBuilder<object>,
  header: string[],
  separator: Separator,
  toCells: (record: T) => string[],
): Promise<Readable> {
  const source = await qb.stream();
  const toCsv = new Transform({
    writableObjectMode: true,
    transform(record: T, _encoding, done) {
      done(null, row(toCells(record), separator));
    },
  });
  toCsv.push(BOM + row(header, separator));
  source.on('error', (error) => toCsv.destroy(error));
  return source.pipe(toCsv);
}

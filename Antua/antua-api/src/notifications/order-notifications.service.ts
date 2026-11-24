import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MailService } from 'src/mail/mail.service';
import type { NotifiedStatus } from 'src/mail/templates/order-status';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';

const NOTIFIED: readonly OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELED,
];

/**
 * Correos de pedidos. Se llaman DESPUÉS de confirmar la transacción y no se esperan: la respuesta
 * al cliente o al panel no se demora, y un proveedor de correo caído nunca deshace un pedido ni un
 * cambio de estado (MailService.deliver no rechaza; acá además se atrapa cualquier otro error).
 */
@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger('Mail');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Confirmación del pedido. Para un invitado, `guestAccessToken` es el único momento en que el
   * token existe en claro (en la base queda solo el hash): el enlace del correo es su llave.
   */
  orderPlaced(
    orderId: number,
    guestAccessToken: string | null,
  ): Promise<boolean> {
    return this.confirmation(orderId, guestAccessToken).catch(() => {
      this.logger.error(
        `No se pudo preparar la confirmación (pedido ${orderId}).`,
      );
      return false;
    });
  }

  /** Aviso de cambio de estado (en preparación, enviado, entregado o cancelado). */
  statusChanged(
    orderId: number,
    status: OrderStatus,
    refundPending: boolean,
  ): Promise<boolean> {
    if (!NOTIFIED.includes(status)) return Promise.resolve(false);
    return this.status(orderId, status as NotifiedStatus, refundPending).catch(
      () => {
        this.logger.error(
          `No se pudo preparar el aviso de estado (pedido ${orderId}).`,
        );
        return false;
      },
    );
  }

  private get siteUrl(): string {
    return this.config.getOrThrow<string>('PUBLIC_URL');
  }

  private load(orderId: number): Promise<Order | null> {
    return this.dataSource.getRepository(Order).findOne({
      where: { id: orderId },
      relations: { items: true, user: true, coupon: true },
    });
  }

  /** La cuenta, si el pedido es de un usuario (o se vinculó a una); si no, el email del invitado. */
  private recipient(order: Order): string | null {
    return order.user?.email ?? order.guest_email ?? null;
  }

  private async confirmation(
    orderId: number,
    token: string | null,
  ): Promise<boolean> {
    const order = await this.load(orderId);
    const to = order && this.recipient(order);
    if (!order || !to) return false;
    const guest = order.user === null;
    return this.mail.sendOrderConfirmation(to, {
      orderId: order.id,
      customerName: order.shipping_full_name,
      createdAt: order.created_at,
      items: order.items.map((item) => ({
        name: item.product_name_snapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price_snapshot),
      })),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount_amount),
      couponCode: order.coupon?.code ?? null,
      shipping: Number(order.shipping_amount),
      total: Number(order.total),
      address: {
        street: order.shipping_street,
        city: order.shipping_city,
        postalCode: order.shipping_postal_code,
      },
      etaDays: order.shipping_eta_days,
      onlinePayment: order.payment_expires_at !== null,
      // El token va en el fragmento (#): el navegador nunca lo manda al servidor ni a los logs.
      link:
        guest && token
          ? `${this.siteUrl}/pedido/${order.id}#t=${token}`
          : `${this.siteUrl}/cuenta/pedidos/${order.id}`,
      guest,
    });
  }

  private async status(
    orderId: number,
    status: NotifiedStatus,
    refundPending: boolean,
  ): Promise<boolean> {
    const order = await this.load(orderId);
    const to = order && this.recipient(order);
    if (!order || !to) return false;
    return this.mail.sendOrderStatus(to, {
      orderId: order.id,
      customerName: order.shipping_full_name,
      status,
      // Un invitado no tiene cuenta: su enlace (con token) está en la confirmación.
      link: order.user ? `${this.siteUrl}/cuenta/pedidos/${order.id}` : null,
      refundPending,
    });
  }
}

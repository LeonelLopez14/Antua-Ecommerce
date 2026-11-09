import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { tokenMatchesHash } from 'src/common/secure-token';
import type { PaymentsConfig } from 'src/config/env.validation';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { Payment } from './entities/payment.entity';
import { PAYMENT_PROVIDER } from './payment-provider';
import type { PaymentProvider } from './payment-provider';
import {
  AMOUNT_MISMATCH,
  isPayableStatus,
  nextPaymentStatus,
  parseExternalReference,
  PaymentStatus,
  sameAmount,
} from './payment-state';

/** Cómo prueba quien llama que el pedido es suyo. */
export interface OrderAccess {
  userId?: number;
  accessToken?: string;
}

const NUMERIC_ID = /^\d+$/;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly settings: PaymentsConfig;

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider | null,
    configService: ConfigService,
  ) {
    this.settings = configService.getOrThrow<PaymentsConfig>('PAYMENTS');
  }

  get webhookSecret(): string | null {
    return this.settings.webhookSecret;
  }

  getConfig() {
    return { enabled: this.settings.mode !== 'disabled' };
  }

  /** Crea el checkout de un pedido propio. El monto sale siempre del pedido, nunca del cliente. */
  async startPayment(orderId: number, access: OrderAccess) {
    const provider = this.requireProvider();
    const order = await this.findAccessibleOrder(orderId, access);

    if (order.status !== OrderStatus.PENDING) throw this.notPayable();
    if (!isPayableStatus(order.payment_status)) throw this.notPayable();
    if (order.payment_expires_at && order.payment_expires_at <= new Date()) {
      throw this.notPayable();
    }

    // Pedidos anteriores a Payments: el plazo empieza con el primer intento.
    const expiresAt =
      order.payment_expires_at ??
      new Date(Date.now() + this.settings.expirationHours * 3_600_000);

    let redirectUrl: string;
    try {
      redirectUrl = await provider.createCheckout({
        orderId: order.id,
        total: Number(order.total),
        currency: this.settings.currency,
        expiresAt,
      });
    } catch {
      this.logger.error(`No se pudo crear el checkout del pedido ${order.id}.`);
      throw new BadGatewayException(
        'No pudimos conectar con el medio de pago. Proba de nuevo en un rato.',
      );
    }

    await this.orders.update(order.id, {
      payment_expires_at: expiresAt,
      // Un reintento vuelve a dejar el pedido esperando el pago.
      payment_status: PaymentStatus.PENDING,
    });

    return { redirectUrl };
  }

  /** Estado según el servidor. Con `paymentId`, antes consulta el pago real al proveedor. */
  async getStatus(
    orderId: number,
    access: OrderAccess,
    paymentId: string | undefined,
  ) {
    const order = await this.findAccessibleOrder(orderId, access);

    if (paymentId && this.provider && NUMERIC_ID.test(paymentId)) {
      try {
        await this.syncPayment(paymentId);
      } catch {
        // Si el proveedor no responde, se informa el último estado conocido.
        this.logger.warn(
          `No se pudo consultar el pago del pedido ${order.id}.`,
        );
      }
    }

    const current = await this.orders.findOneByOrFail({ id: order.id });
    const canPay =
      this.settings.mode !== 'disabled' &&
      current.status === OrderStatus.PENDING &&
      isPayableStatus(current.payment_status) &&
      (!current.payment_expires_at || current.payment_expires_at > new Date());

    return {
      orderId: current.id,
      paymentStatus: current.payment_status,
      orderStatus: current.status,
      canPay,
    };
  }

  /**
   * Aplica el estado real de un pago. Es idempotente: el pedido queda bloqueado mientras
   * se procesa, y un pago que ya tiene ese estado no cambia nada.
   */
  async syncPayment(providerId: string): Promise<void> {
    const payment = await this.requireProvider().getPayment(providerId);
    const orderId = parseExternalReference(payment.externalReference);
    if (orderId === null) return;

    await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(Order);
      const payments = manager.getRepository(Payment);

      const order = await orders.findOne({
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) return;

      const matches =
        sameAmount(payment.amount, Number(order.total)) &&
        payment.currency === this.settings.currency;
      const status = matches ? payment.status : AMOUNT_MISMATCH;

      const existing = await payments.findOne({
        where: { transaction_ref: payment.id },
      });
      if (existing?.status === status) return;

      const approved = matches && payment.status === 'approved';
      await payments.save({
        ...(existing ?? {
          order: { id: order.id },
          transaction_ref: payment.id,
        }),
        method: payment.method ?? 'desconocido',
        amount: payment.amount,
        currency: payment.currency,
        status,
        paid_at: approved ? new Date() : (existing?.paid_at ?? null),
      });

      if (!matches) {
        this.logger.warn(
          `El pago ${payment.id} no coincide con el pedido ${order.id} en monto o moneda: no se aplica.`,
        );
        return;
      }

      const next = nextPaymentStatus(order.payment_status, payment.status);
      if (next === PaymentStatus.PAID_AFTER_CANCEL) {
        this.logger.warn(
          `El pedido ${order.id} se pagó después de vencer: requiere revisión manual.`,
        );
      }
      if (next !== order.payment_status) {
        await orders.update(order.id, { payment_status: next });
      }
    });
  }

  private requireProvider(): PaymentProvider {
    if (!this.provider) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'PAYMENTS_DISABLED',
        message: 'El pago online no esta disponible.',
      });
    }
    return this.provider;
  }

  private notPayable() {
    return new ConflictException({
      statusCode: 409,
      code: 'ORDER_NOT_PAYABLE',
      message: 'Este pedido ya no se puede pagar.',
    });
  }

  /** Dueño con sesión o invitado con su token. Para cualquier otro, el pedido "no existe". */
  private async findAccessibleOrder(orderId: number, access: OrderAccess) {
    const order = await this.orders
      .createQueryBuilder('o')
      .addSelect('o.guest_access_token_hash')
      .leftJoinAndSelect('o.user', 'user')
      .where('o.id = :orderId', { orderId })
      .getOne();

    const allowed =
      order &&
      (order.user
        ? order.user.id === access.userId
        : tokenMatchesHash(access.accessToken, order.guest_access_token_hash));

    if (!allowed) throw new NotFoundException('Orden no encontrada.');
    return order;
  }
}

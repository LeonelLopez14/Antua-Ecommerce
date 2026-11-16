import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThan } from 'typeorm';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { releaseOrderReservation } from 'src/orders/order-reservation';
import { isPayableStatus, PaymentStatus } from './payment-state';

const EVERY_TEN_MINUTES = 600_000;

/** Cancela los pedidos que vencieron sin pago y devuelve lo que Orders había reservado. */
@Injectable()
export class PaymentExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentExpirationService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.expireOverdueOrders();
    }, EVERY_TEN_MINUTES);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async expireOverdueOrders(): Promise<number> {
    const overdue = await this.dataSource.getRepository(Order).find({
      select: { id: true },
      where: {
        status: OrderStatus.PENDING,
        payment_status: In([PaymentStatus.PENDING, PaymentStatus.FAILED]),
        payment_expires_at: LessThan(new Date()),
      },
    });

    let canceled = 0;
    for (const { id } of overdue) {
      try {
        if (await this.cancelIfOverdue(id)) canceled++;
      } catch {
        this.logger.error(`No se pudo cancelar el pedido vencido ${id}.`);
      }
    }
    return canceled;
  }

  private cancelIfOverdue(orderId: number): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(Order);
      const order = await orders.findOne({
        where: { id: orderId },
        relations: { coupon: true },
        lock: { mode: 'pessimistic_write' },
      });

      // Se revisa de nuevo con la fila bloqueada: el pago pudo aprobarse recién.
      if (
        !order ||
        order.status !== OrderStatus.PENDING ||
        !isPayableStatus(order.payment_status)
      ) {
        return false;
      }

      await releaseOrderReservation(manager, order);

      await orders.update(order.id, {
        status: OrderStatus.CANCELED,
        payment_status: PaymentStatus.CANCELED,
      });
      return true;
    });
  }
}

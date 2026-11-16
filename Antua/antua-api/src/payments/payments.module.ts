import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { PaymentsConfig } from 'src/config/env.validation';
import { Order } from 'src/orders/entities/order.entity';
import { MercadoPagoProvider } from './mercadopago.provider';
import { Payment } from './entities/payment.entity';
import { PaymentExpirationService } from './payment-expiration.service';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SimulatedProvider } from './simulated.provider';

function createProvider(config: ConfigService): PaymentProvider | null {
  const settings = config.getOrThrow<PaymentsConfig>('PAYMENTS');
  const logger = new Logger('Payments');

  if (settings.mode === 'simulated') {
    logger.warn('Pagos SIMULADOS: no se conecta con Mercado Pago.');
    return new SimulatedProvider(config.getOrThrow<string>('FRONTEND_URL'));
  }
  if (settings.mode === 'mercadopago') return new MercadoPagoProvider(settings);

  logger.warn(
    'Pagos deshabilitados: faltan MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET. Los pedidos se registran sin cobrar.',
  );
  return null;
}

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order])],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentExpirationService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: createProvider,
    },
  ],
})
export class PaymentsModule {}

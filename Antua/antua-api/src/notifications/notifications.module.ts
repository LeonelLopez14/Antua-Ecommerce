import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from 'src/mail/mail.module';
import { OrderNotificationsService } from './order-notifications.service';

/** Correos de pedidos (confirmación y cambios de estado). Lo usan OrdersModule y AdminModule. */
@Module({
  imports: [MailModule, ConfigModule],
  providers: [OrderNotificationsService],
  exports: [OrderNotificationsService],
})
export class NotificationsModule {}

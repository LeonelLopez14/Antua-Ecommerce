import { Module } from '@nestjs/common';
import { LogMailTransport } from './log-mail.transport';
import { MailService } from './mail.service';
import { MAIL_TRANSPORT } from './mail.types';

@Module({
  // Para usar un proveedor real, reemplazar `useClass` por su implementación de MailTransport.
  providers: [
    MailService,
    { provide: MAIL_TRANSPORT, useClass: LogMailTransport },
  ],
  exports: [MailService],
})
export class MailModule {}

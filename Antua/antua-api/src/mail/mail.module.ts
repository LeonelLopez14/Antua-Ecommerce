import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { MailConfig } from 'src/config/env.validation';
import { LogMailTransport } from './log-mail.transport';
import { MailService } from './mail.service';
import {
  MAIL_RETRY_DELAY_MS,
  MAIL_TRANSPORT,
  type MailTransport,
} from './mail.types';
import { SmtpMailTransport } from './smtp-mail.transport';

@Module({
  imports: [ConfigModule],
  providers: [
    MailService,
    {
      // MAIL_TRANSPORT=log (por defecto): escribe en el log. smtp: envía de verdad (o a Mailpit).
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailTransport => {
        const mail = config.getOrThrow<MailConfig>('MAIL');
        if (mail.transport === 'smtp') {
          new Logger('Mail').log(
            `Correos por SMTP (${mail.host}:${mail.port}).`,
          );
          return new SmtpMailTransport(mail);
        }
        return new LogMailTransport();
      },
    },
    { provide: MAIL_RETRY_DELAY_MS, useValue: 2000 },
  ],
  exports: [MailService],
})
export class MailModule {}

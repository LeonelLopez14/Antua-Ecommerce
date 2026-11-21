import { createTransport, type Transporter } from 'nodemailer';
import type { MailConfig } from 'src/config/env.validation';
import type { MailMessage, MailTransport } from './mail.types';

type SmtpConfig = Extract<MailConfig, { transport: 'smtp' }>;

/**
 * Envía por SMTP (el proveedor real en producción, o Mailpit en desarrollo).
 * La configuración se valida al arrancar (parseMailConfig): acá ya está completa.
 */
export class SmtpMailTransport implements MailTransport {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth ?? undefined,
      // Que un servidor que no responde no deje colgado el envío.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send({ to, subject, text, html }: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to,
      subject,
      text,
      html,
    });
  }
}

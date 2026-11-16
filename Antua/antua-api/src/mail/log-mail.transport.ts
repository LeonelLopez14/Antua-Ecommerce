import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from './mail.types';

/** "ana@mail.com" → "a***@mail.com": alcanza para reconocer el destinatario sin guardarlo. */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain ?? ''}`;
};

/**
 * Transporte de desarrollo: escribe el mensaje en el log en vez de enviarlo, porque no hay SMTP.
 * El cuerpo incluye el link de recuperación, así que en producción se niega a funcionar.
 */
@Injectable()
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  send({ to, subject, text }: MailMessage): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return Promise.reject(
        new Error('Falta configurar un proveedor de email real.'),
      );
    }
    this.logger.log(`Para: ${maskEmail(to)} | ${subject}\n${text}`);
    return Promise.resolve();
  }
}

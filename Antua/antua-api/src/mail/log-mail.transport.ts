import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from './mail.types';

/** "ana@mail.com" → "a***@mail.com": alcanza para reconocer el destinatario sin guardarlo. */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain ?? ''}`;
};

/**
 * Transporte de desarrollo (MAIL_TRANSPORT=log): no envía nada. Escribe en el log el
 * destinatario enmascarado, el asunto y los enlaces del correo (para poder seguir, por
 * ejemplo, el de recuperación de contraseña). El cuerpo NO va al log: tiene nombres y
 * direcciones. Para ver el correo completo, usá Mailpit (perfil `mail` del compose de desarrollo).
 * En producción se niega a funcionar.
 */
@Injectable()
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  send({ to, subject, text }: MailMessage): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return Promise.reject(
        new Error('MAIL_TRANSPORT=log no envía correos en producción.'),
      );
    }
    const links = text.match(/https?:\/\/\S+/g) ?? [];
    this.logger.log(
      [`Para: ${maskEmail(to)} | ${subject}`, ...links].join('\n'),
    );
    return Promise.resolve();
  }
}

import { Logger } from '@nestjs/common';
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
/** Lo crea MailModule con `new` (no lo inyecta Nest). */
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  constructor(
    private readonly print: (text: string) => void = (text) =>
      process.stdout.write(`${text}\n`),
  ) {}

  send({ to, subject, text }: MailMessage): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return Promise.reject(
        new Error('MAIL_TRANSPORT=log no envía correos en producción.'),
      );
    }
    this.logger.log(`Correo simulado para ${maskEmail(to)}: ${subject}`);
    // Los enlaces (con su token, por ejemplo el de recuperación) van directo a la consola, no al
    // logger: el logger los redactaría, y en desarrollo hacen falta para seguir el flujo. Es seguro
    // porque este transporte no funciona en producción (ver arriba).
    const links = text.match(/https?:\/\/\S+/g) ?? [];
    if (links.length) this.print(`  enlaces del correo: ${links.join(' ')}`);
    return Promise.resolve();
  }
}

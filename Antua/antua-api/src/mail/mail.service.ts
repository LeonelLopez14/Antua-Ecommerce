import { Inject, Injectable } from '@nestjs/common';
import { MAIL_TRANSPORT, type MailTransport } from './mail.types';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  sendPasswordReset(to: string, link: string, minutes: number): Promise<void> {
    return this.transport.send({
      to,
      subject: 'Restablecé tu contraseña de Antua',
      text: [
        'Recibimos un pedido para restablecer tu contraseña.',
        `Entrá a este link (vence en ${minutes} minutos y sirve una sola vez):`,
        link,
        'Si no fuiste vos, ignorá este mensaje: tu contraseña no cambia.',
      ].join('\n'),
    });
  }
}

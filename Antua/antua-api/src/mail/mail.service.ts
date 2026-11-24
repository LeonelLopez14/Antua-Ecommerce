import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MAIL_RETRY_DELAY_MS,
  MAIL_TRANSPORT,
  type MailTransport,
} from './mail.types';
import type { RenderedMail } from './templates/layout';
import {
  orderConfirmationMail,
  type OrderConfirmationData,
} from './templates/order-confirmation';
import {
  orderStatusMail,
  type OrderStatusData,
} from './templates/order-status';
import { passwordResetMail } from './templates/password-reset';

/**
 * Código del error, nunca el mensaje: el mensaje de un servidor SMTP puede traer la dirección
 * del destinatario ("550 <ana@…>: unknown user"), y los logs no llevan datos personales.
 */
function errorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const { code, responseCode } = error as {
      code?: unknown;
      responseCode?: unknown;
    };
    const parts = [code, responseCode].filter(
      (part) => typeof part === 'string' || typeof part === 'number',
    );
    if (parts.length > 0) return parts.join(' ');
  }
  return error instanceof Error ? error.name : 'desconocido';
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @Inject(MAIL_RETRY_DELAY_MS) private readonly retryDelayMs: number,
  ) {}

  /**
   * Arma y envía un correo con un reintento. NUNCA rechaza: devuelve false si no salió, y lo
   * deja en el log solo con el tipo, la referencia (por ejemplo "pedido 12") y el código del
   * error. Así un proveedor caído no rompe un pedido ni un cambio de estado.
   */
  async deliver(
    kind: string,
    reference: string,
    to: string,
    render: () => RenderedMail,
  ): Promise<boolean> {
    let mail: RenderedMail;
    try {
      mail = render();
    } catch (error) {
      this.logger.error(
        `No se pudo armar el correo de ${kind} (${reference}): ${error instanceof Error ? error.message : 'error'}`,
      );
      return false;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.transport.send({ to, ...mail });
        return true;
      } catch (error) {
        if (attempt === 2) {
          this.logger.error(
            `No se pudo enviar el correo de ${kind} (${reference}) después de 2 intentos: ${errorCode(error)}`,
          );
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
    return false;
  }

  sendPasswordReset(
    to: string,
    link: string,
    minutes: number,
  ): Promise<boolean> {
    return this.deliver('recuperación de contraseña', 'cuenta', to, () =>
      passwordResetMail(link, minutes),
    );
  }

  sendOrderConfirmation(
    to: string,
    data: OrderConfirmationData,
  ): Promise<boolean> {
    return this.deliver('confirmación', `pedido ${data.orderId}`, to, () =>
      orderConfirmationMail(data),
    );
  }

  sendOrderStatus(to: string, data: OrderStatusData): Promise<boolean> {
    return this.deliver(
      `estado ${data.status}`,
      `pedido ${data.orderId}`,
      to,
      () => orderStatusMail(data),
    );
  }
}

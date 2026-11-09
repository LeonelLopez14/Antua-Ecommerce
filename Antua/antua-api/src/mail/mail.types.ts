export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Cómo sale un email. Para conectar un proveedor real, se implementa esto y se registra en MailModule. */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

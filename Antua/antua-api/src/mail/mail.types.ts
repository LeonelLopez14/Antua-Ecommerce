export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Versión HTML (las plantillas de src/mail/templates escapan los datos de usuario). */
  html?: string;
}

/** Cómo sale un correo: LogMailTransport (desarrollo) o SmtpMailTransport. Lo elige MailModule según MAIL_TRANSPORT. */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/** Milisegundos antes del reintento (los tests lo bajan a 0). */
export const MAIL_RETRY_DELAY_MS = Symbol('MAIL_RETRY_DELAY_MS');

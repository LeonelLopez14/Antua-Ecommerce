import { layout, paragraph, TEXT_FOOTER, type RenderedMail } from './layout';

/** Estados que avisan por correo (pending es el inicial: ese lo cubre la confirmación). */
export type NotifiedStatus = 'preparing' | 'shipped' | 'delivered' | 'canceled';

export interface OrderStatusData {
  orderId: number;
  customerName: string;
  status: NotifiedStatus;
  /** Con cuenta: /cuenta/pedidos/:id. Invitado: null (su enlace con token está en la confirmación). */
  link: string | null;
  /** Cancelado después de pagar: la devolución se hace aparte. */
  refundPending?: boolean;
}

const COPY: Record<
  NotifiedStatus,
  { subject: string; title: string; text: string }
> = {
  preparing: {
    subject: 'Estamos preparando tu pedido',
    title: 'Tu pedido está en preparación',
    text: 'Ya estamos horneando y armando tu pedido. Te avisamos cuando salga.',
  },
  shipped: {
    subject: 'Tu pedido va en camino',
    title: 'Tu pedido salió',
    text: 'Tu pedido ya está en camino a la dirección que nos diste.',
  },
  delivered: {
    subject: 'Tu pedido fue entregado',
    title: '¡Tu pedido llegó!',
    text: 'Esperamos que lo disfrutes. Si querés, contanos qué te pareció con una reseña.',
  },
  canceled: {
    subject: 'Tu pedido fue cancelado',
    title: 'Cancelamos tu pedido',
    text: 'Tu pedido fue cancelado. Si tenés dudas, respondé este correo o escribinos.',
  },
};

/** Aviso de cambio de estado del pedido. */
export function orderStatusMail(data: OrderStatusData): RenderedMail {
  if (!Number.isInteger(data.orderId) || data.orderId <= 0) {
    throw new Error('Falta el número de pedido.');
  }
  const copy = COPY[data.status];
  const subject = `${copy.subject} (#${data.orderId})`;
  const refund =
    data.status === 'canceled' && data.refundPending
      ? 'Como ya habías pagado, vamos a devolverte el dinero por el mismo medio. Te avisamos cuando esté hecho.'
      : null;
  const guestNote = data.link
    ? null
    : 'Para ver el detalle, usá el enlace del correo de confirmación de tu pedido.';
  const lines = [
    `Hola, ${data.customerName}.`,
    `${copy.text}`,
    ...(refund ? [refund] : []),
    ...(guestNote ? [guestNote] : []),
  ];

  const html = layout({
    title: copy.title,
    preheader: `Pedido #${data.orderId}: ${copy.title.toLowerCase()}`,
    body: [paragraph(`Pedido #${data.orderId}`), ...lines.map(paragraph)].join(
      '\n',
    ),
    action: data.link ? { label: 'Ver mi pedido', url: data.link } : undefined,
  });

  const text = [
    copy.title,
    '',
    `Pedido #${data.orderId}`,
    ...lines,
    ...(data.link ? ['', `Ver mi pedido: ${data.link}`] : []),
    '',
    TEXT_FOOTER,
  ].join('\n');

  return { subject, text, html };
}

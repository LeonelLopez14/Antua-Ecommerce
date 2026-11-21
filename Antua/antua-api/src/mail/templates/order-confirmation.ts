import {
  escapeHtml,
  formatDateTime,
  formatMoney,
  layout,
  paragraph,
  TEXT_FOOTER,
  type RenderedMail,
} from './layout';

export interface OrderMailItem {
  name: string;
  quantity: number;
  /** Precio unitario del snapshot del pedido (no el de hoy). */
  unitPrice: number;
}

export interface OrderConfirmationData {
  orderId: number;
  customerName: string;
  createdAt: Date;
  items: OrderMailItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shipping: number;
  total: number;
  address: { street: string; city: string; postalCode: string };
  /** Plazo estimado de entrega en días (SHIPPING_ETA_DAYS al crear el pedido), o null. */
  etaDays: number | null;
  /** true: pago con Mercado Pago pendiente. false: los pagos en línea no estaban activos. */
  onlinePayment: boolean;
  /**
   * Dónde ver el pedido. Invitado: /pedido/:id#t=<token> (el token es su única llave).
   * Con cuenta: /cuenta/pedidos/:id.
   */
  link: string;
  guest: boolean;
}

function assertComplete(data: OrderConfirmationData): void {
  if (!Number.isInteger(data.orderId) || data.orderId <= 0) {
    throw new Error('Falta el número de pedido.');
  }
  if (data.items.length === 0) throw new Error('El pedido no tiene ítems.');
  if (!data.customerName.trim()) throw new Error('Falta el nombre.');
  if (
    ![data.subtotal, data.discount, data.shipping, data.total].every(
      Number.isFinite,
    )
  ) {
    throw new Error('Montos inválidos.');
  }
}

/** Confirmación de pedido: número, ítems, montos, dirección, plazo y cómo seguirlo. */
export function orderConfirmationMail(
  data: OrderConfirmationData,
): RenderedMail {
  assertComplete(data);
  const subject = `Recibimos tu pedido #${data.orderId}`;
  const eta = data.etaDays
    ? `Plazo estimado de entrega: ${data.etaDays} ${data.etaDays === 1 ? 'día' : 'días'}.`
    : 'Te avisamos por correo cuando lo enviemos.';
  const payment = data.onlinePayment
    ? 'Si todavía no terminaste el pago en Mercado Pago, podés hacerlo desde el enlace de abajo. El pedido se confirma cuando nos llega la aprobación.'
    : 'El pago en línea todavía no está activo: te contactamos para coordinarlo.';
  const follow = data.guest
    ? 'Guardá este correo: el enlace es la forma de ver tu pedido sin cuenta. No lo compartas.'
    : 'También lo ves en tu cuenta, en Mis pedidos.';
  const address = `${data.address.street}, ${data.address.city} (${data.address.postalCode})`;

  const rows = data.items
    .map(
      (item) =>
        `<tr><td class="line" style="padding:8px 0;border-bottom:1px solid #E4E1EC">${escapeHtml(item.name)}<br><span class="muted" style="font-size:14px;color:#5A5855">${item.quantity} × ${formatMoney(item.unitPrice)}</span></td><td class="line" align="right" style="padding:8px 0;border-bottom:1px solid #E4E1EC;white-space:nowrap">${formatMoney(item.quantity * item.unitPrice)}</td></tr>`,
    )
    .join('');
  const total = (label: string, amount: string, strong = false) =>
    `<tr><td style="padding:4px 0${strong ? ';font-weight:bold' : ''}">${escapeHtml(label)}</td><td align="right" style="padding:4px 0;white-space:nowrap${strong ? ';font-weight:bold' : ''}">${amount}</td></tr>`;

  const html = layout({
    title: `¡Gracias por tu pedido, ${data.customerName}!`,
    preheader: `Pedido #${data.orderId}: ${formatMoney(data.total)}`,
    body: [
      paragraph(
        `Recibimos tu pedido #${data.orderId} el ${formatDateTime(data.createdAt)}.`,
      ),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${rows}</table>`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`,
      total('Subtotal', formatMoney(data.subtotal)),
      data.discount > 0
        ? total(
            `Descuento${data.couponCode ? ` (${data.couponCode})` : ''}`,
            `−${formatMoney(data.discount)}`,
          )
        : '',
      total('Envío', formatMoney(data.shipping)),
      total('Total', formatMoney(data.total), true),
      `</table>`,
      `<p style="margin:20px 0 4px;font-weight:bold">Entrega</p>`,
      paragraph(address),
      paragraph(eta),
      paragraph(payment),
      paragraph(follow),
    ].join('\n'),
    action: { label: 'Ver mi pedido', url: data.link },
  });

  const text = [
    `¡Gracias por tu pedido, ${data.customerName}!`,
    '',
    `Pedido #${data.orderId} (${formatDateTime(data.createdAt)})`,
    ...data.items.map(
      (item) =>
        `- ${item.name}: ${item.quantity} × ${formatMoney(item.unitPrice)} = ${formatMoney(item.quantity * item.unitPrice)}`,
    ),
    '',
    `Subtotal: ${formatMoney(data.subtotal)}`,
    ...(data.discount > 0
      ? [
          `Descuento${data.couponCode ? ` (${data.couponCode})` : ''}: −${formatMoney(data.discount)}`,
        ]
      : []),
    `Envío: ${formatMoney(data.shipping)}`,
    `Total: ${formatMoney(data.total)}`,
    '',
    `Entrega: ${address}`,
    eta,
    payment,
    '',
    `Ver mi pedido: ${data.link}`,
    follow,
    '',
    TEXT_FOOTER,
  ].join('\n');

  return { subject, text, html };
}

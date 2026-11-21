import { escapeHtml, safeUrl } from './layout';
import {
  orderConfirmationMail,
  type OrderConfirmationData,
} from './order-confirmation';
import { orderStatusMail } from './order-status';
import { passwordResetMail } from './password-reset';

const ORDER: OrderConfirmationData = {
  orderId: 42,
  customerName: 'Ana Pérez',
  createdAt: new Date('2026-11-20T15:30:00Z'),
  items: [
    { name: 'Clásica con chips', quantity: 2, unitPrice: 350 },
    { name: 'Vegana de avena', quantity: 1, unitPrice: 400 },
  ],
  subtotal: 1100,
  discount: 100,
  couponCode: 'SEEDFIJO',
  shipping: 150,
  total: 1150,
  address: {
    street: 'Av. 18 de Julio 1234',
    city: 'Montevideo',
    postalCode: '11200',
  },
  etaDays: 3,
  onlinePayment: false,
  link: 'https://antojarte.lan/pedido/42#t=abc123',
  guest: true,
};

describe('plantillas de correo', () => {
  it('escapeHtml neutraliza HTML', () => {
    expect(escapeHtml(`<b onclick="x">'a' & b</b>`)).toBe(
      '&lt;b onclick=&quot;x&quot;&gt;&#39;a&#39; &amp; b&lt;/b&gt;',
    );
  });

  it('solo acepta enlaces http(s)', () => {
    expect(safeUrl('https://a.test/x')).toBe('https://a.test/x');
    expect(() => safeUrl('javascript:alert(1)')).toThrow();
    expect(() => safeUrl('no es una url')).toThrow();
  });

  describe('confirmación de pedido', () => {
    it('trae número, ítems con el precio del snapshot, descuento, envío, total, dirección y plazo', () => {
      const { subject, text, html } = orderConfirmationMail(ORDER);
      expect(subject).toBe('Recibimos tu pedido #42');
      for (const part of [
        'Clásica con chips: 2 ×',
        'Descuento (SEEDFIJO)',
        'Envío',
        'Total',
        'Av. 18 de Julio 1234, Montevideo (11200)',
        'Plazo estimado de entrega: 3 días.',
        'https://antojarte.lan/pedido/42#t=abc123',
      ]) {
        expect(text).toContain(part);
      }
      // Montos en pesos uruguayos (el separador depende de Intl: se comprueba el número).
      expect(text).toMatch(/Total: .*1\.150/);
      expect(html).toContain('https://antojarte.lan/pedido/42#t=abc123');
      expect(html).toContain('lang="es"');
      // Sin imágenes remotas ni rastreadores.
      expect(html).not.toMatch(/<img/i);
    });

    it('escapa todo dato del cliente en el HTML', () => {
      const { html } = orderConfirmationMail({
        ...ORDER,
        customerName: '<script>alert(1)</script>',
        items: [
          { name: '<img src=x onerror=alert(2)>', quantity: 1, unitPrice: 1 },
        ],
        address: {
          street: '"><b>calle</b>',
          city: 'Montevideo',
          postalCode: '1',
        },
        couponCode: '<i>X</i>',
      });
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain('<b>calle</b>');
      expect(html).not.toContain('<i>X</i>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('falla si faltan campos obligatorios', () => {
      expect(() => orderConfirmationMail({ ...ORDER, items: [] })).toThrow();
      expect(() => orderConfirmationMail({ ...ORDER, orderId: 0 })).toThrow();
      expect(() =>
        orderConfirmationMail({ ...ORDER, customerName: ' ' }),
      ).toThrow();
      expect(() =>
        orderConfirmationMail({ ...ORDER, total: Number.NaN }),
      ).toThrow();
      expect(() =>
        orderConfirmationMail({ ...ORDER, link: 'javascript:x' }),
      ).toThrow();
    });

    it('con cuenta no habla del token, y sin descuento no muestra la línea', () => {
      const { text } = orderConfirmationMail({
        ...ORDER,
        guest: false,
        discount: 0,
        couponCode: null,
        link: 'https://antojarte.lan/cuenta/pedidos/42',
      });
      expect(text).not.toContain('Descuento');
      expect(text).toContain('Mis pedidos');
    });
  });

  describe('cambio de estado', () => {
    it('tiene un texto por estado y el enlace solo con cuenta', () => {
      for (const status of [
        'preparing',
        'shipped',
        'delivered',
        'canceled',
      ] as const) {
        const mail = orderStatusMail({
          orderId: 7,
          customerName: 'Ana',
          status,
          link: null,
        });
        expect(mail.subject).toContain('#7');
        expect(mail.text).toContain('enlace del correo de confirmación');
        expect(mail.html).not.toContain('Ver mi pedido');
      }
      const withAccount = orderStatusMail({
        orderId: 7,
        customerName: 'Ana',
        status: 'shipped',
        link: 'https://antojarte.lan/cuenta/pedidos/7',
      });
      expect(withAccount.html).toContain('Ver mi pedido');
    });

    it('cancelado después de pagar menciona la devolución', () => {
      const mail = orderStatusMail({
        orderId: 7,
        customerName: 'Ana',
        status: 'canceled',
        link: null,
        refundPending: true,
      });
      expect(mail.text).toContain('devolverte el dinero');
    });

    it('escapa el nombre', () => {
      const { html } = orderStatusMail({
        orderId: 7,
        customerName: '<script>x</script>',
        status: 'delivered',
        link: null,
      });
      expect(html).not.toContain('<script>');
    });
  });

  it('recuperación: enlace y vencimiento, sin contraseña', () => {
    const { subject, text, html } = passwordResetMail(
      'https://a.test/r?token=t',
      60,
    );
    expect(subject).toBe('Restablecé tu contraseña de Antojarte');
    expect(text).toContain('https://a.test/r?token=t');
    expect(text).toContain('60 minutos');
    expect(html).toContain('href="https://a.test/r?token=t"');
  });
});

import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createProduct,
  createTestApp,
  mailFailures,
  newGuestToken,
  registerAdmin,
  registerUser,
  resetDatabase,
  sentMails,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

/** Los correos salen en segundo plano: espera a que lleguen (o a que se agoten los intentos). */
async function waitFor(check: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !check(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe('correos de pedidos', () => {
  let app: TestApp;
  let db: DataSource;
  let variantId: number;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(async () => {
    await resetDatabase(db);
    sentMails.length = 0;
    mailFailures.down = false;
    mailFailures.attempts = 0;
    ({
      variant: { id: variantId },
    } = await createProduct(db, 'correo', 1200, 10));
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();

  async function guestOrder(shipping = SHIPPING_DATA) {
    const guest = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', guest)
      .send({ variantId, quantity: 2 })
      .expect(201);
    const res = await request(server())
      .post('/orders')
      .set('X-Guest-Token', guest)
      .send({ ...shipping, guest_email: 'invitada@antua.test' })
      .expect(201);
    return res.body as { order: { id: number }; accessToken: string };
  }

  it('invitado: la confirmación trae los ítems, el total y su enlace con token', async () => {
    const { order, accessToken } = await guestOrder();
    await waitFor(() => sentMails.length > 0);

    expect(sentMails).toHaveLength(1);
    const [mail] = sentMails;
    expect(mail.to).toBe('invitada@antua.test');
    expect(mail.subject).toBe(`Recibimos tu pedido #${order.id}`);
    expect(mail.text).toContain('Producto correo: 2 ×');
    expect(mail.text).toContain(`/pedido/${order.id}#t=${accessToken}`);
    expect(mail.html).toContain(`/pedido/${order.id}#t=${accessToken}`);
    // Nunca la contraseña ni el hash del token.
    expect(mail.text).not.toMatch(/contraseña/i);

    // El enlace del correo funciona: el token da acceso a ese pedido (y solo a ese).
    await request(server())
      .get(`/orders/guest/${order.id}`)
      .set('X-Order-Token', accessToken)
      .expect(200);
  });

  it('con cuenta: el enlace lleva a Mis pedidos, sin token', async () => {
    const { token } = await registerUser(app, 'cuenta@antua.test');
    await request(server())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    const res = await request(server())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(SHIPPING_DATA)
      .expect(201);
    const { id } = (res.body as { order: { id: number } }).order;
    await waitFor(() => sentMails.length > 0);

    expect(sentMails[0].to).toBe('cuenta@antua.test');
    expect(sentMails[0].text).toContain(`/cuenta/pedidos/${id}`);
    expect(sentMails[0].text).not.toContain('#t=');
  });

  it('el HTML escapa lo que escribió el cliente: un nombre con HTML no se ejecuta', async () => {
    await guestOrder({
      ...SHIPPING_DATA,
      shipping_full_name: '<img src=x onerror=alert(1)> Ana',
      shipping_street: '"><script>alert(2)</script>',
    });
    await waitFor(() => sentMails.length > 0);

    const { html } = sentMails[0];
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; Ana');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('si el proveedor de correo falla, el pedido igual se crea (y se reintenta una vez)', async () => {
    mailFailures.down = true;
    const { order, accessToken } = await guestOrder();
    await waitFor(() => mailFailures.attempts >= 2);

    expect(mailFailures.attempts).toBe(2);
    expect(sentMails).toHaveLength(0);
    await request(server())
      .get(`/orders/guest/${order.id}`)
      .set('X-Order-Token', accessToken)
      .expect(200);
  });

  it('un cambio de estado desde el panel avisa al cliente, y un correo caído no lo revierte', async () => {
    const admin = (await registerAdmin(app, db)).token;
    const { order } = await guestOrder();
    await waitFor(() => sentMails.length > 0);
    sentMails.length = 0;

    mailFailures.down = true;
    const res = await request(server())
      .patch(`/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'canceled' })
      .expect(200);
    expect((res.body as { status: string }).status).toBe('canceled');
    await waitFor(() => mailFailures.attempts >= 2);
    expect(mailFailures.attempts).toBe(2);

    // Con el correo funcionando, el aviso llega (sin enlace: es un invitado).
    mailFailures.down = false;
    const { order: second } = await guestOrder();
    await waitFor(() => sentMails.length > 0);
    sentMails.length = 0;
    await request(server())
      .patch(`/admin/orders/${second.id}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'canceled' })
      .expect(200);
    await waitFor(() => sentMails.length > 0);
    expect(sentMails[0].subject).toBe(
      `Tu pedido fue cancelado (#${second.id})`,
    );
    expect(sentMails[0].text).toContain('enlace del correo de confirmación');
  });
});

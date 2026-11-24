import request from 'supertest';
import { DataSource } from 'typeorm';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import {
  createCoupon,
  createProduct,
  createTestApp,
  newGuestToken,
  registerAdmin,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

interface OrderDetail {
  id: number;
  status: string;
  allowedTransitions: string[];
  payment: { status: string };
  totals: { total: number; subtotal: number };
  internal_note: string | null;
  history: { from: string; to: string; by: { name: string } | null }[];
  notice?: string;
  coupon: { code: string } | null;
}

describe('panel: pedidos', () => {
  let app: TestApp;
  let db: DataSource;
  let token: string;
  let variantId: number;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(async () => {
    await resetDatabase(db);
    token = (await registerAdmin(app, db)).token;
    ({
      variant: { id: variantId },
    } = await createProduct(db, 'pedido', 1000, 10));
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

  async function placeGuestOrder(quantity = 2, coupon?: string) {
    const guest = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', guest)
      .send({ variantId, quantity })
      .expect(201);
    if (coupon) {
      await request(server())
        .post('/cart/coupon')
        .set('X-Guest-Token', guest)
        .send({ couponCode: coupon })
        .expect(201);
    }
    const res = await request(server())
      .post('/orders')
      .set('X-Guest-Token', guest)
      .send({
        ...SHIPPING_DATA,
        guest_email: 'cliente.invitado@antojarte.example',
      })
      .expect(201);
    return res.body as { order: { id: number }; accessToken: string };
  }

  const setStatus = (id: number, status: string) =>
    auth(request(server()).patch(`/admin/orders/${id}/status`)).send({
      status,
    });
  const stock = async () =>
    (await db.getRepository(ProductVariant).findOneByOrFail({ id: variantId }))
      .stock;

  it('no prepara un pedido sin pago aprobado: 409 con el motivo', async () => {
    const { order } = await placeGuestOrder();
    const res = await setStatus(order.id, 'preparing').expect(409);
    expect(res.body).toMatchObject({ code: 'INVALID_TRANSITION' });
    expect((res.body as { message: string }).message).toContain('pago');
  });

  it('recorre pagado → preparación → enviado → entregado, con historial y auditoría', async () => {
    const { order } = await placeGuestOrder();
    await db.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [
      order.id,
    ]);

    await setStatus(order.id, 'shipped').expect(409);
    await setStatus(order.id, 'preparing').expect(200);
    await setStatus(order.id, 'shipped').expect(200);
    await setStatus(order.id, 'preparing').expect(409);
    await setStatus(order.id, 'canceled').expect(409);
    const done = (await setStatus(order.id, 'delivered').expect(200))
      .body as OrderDetail;

    expect(done.status).toBe('delivered');
    expect(done.allowedTransitions).toEqual([]);
    expect(done.history.map((h) => `${h.from}→${h.to}`)).toEqual([
      'shipped→delivered',
      'preparing→shipped',
      'pending→preparing',
    ]);
    expect(done.history[0].by?.name).toBe('Usuario de Prueba');

    const audit = await auth(
      request(server()).get(`/admin/audit?entity=order&entityId=${order.id}`),
    ).expect(200);
    expect((audit.body as { items: unknown[] }).items).toHaveLength(3);
    await setStatus(order.id, 'perdido').expect(400);
  });

  it('cancelar devuelve el stock y el uso del cupón; el pago pendiente queda cancelado', async () => {
    const coupon = await createCoupon(db, 'DESCUENTO');
    const { order } = await placeGuestOrder(3, 'DESCUENTO');
    expect(await stock()).toBe(7);
    expect(
      (await db.getRepository(Coupon).findOneByOrFail({ id: coupon.id }))
        .times_used,
    ).toBe(1);

    const res = (await setStatus(order.id, 'canceled').expect(200))
      .body as OrderDetail;
    expect(res).toMatchObject({
      status: 'canceled',
      payment: { status: 'canceled' },
    });
    expect(res.notice).toBeUndefined();
    expect(await stock()).toBe(10);
    expect(
      (await db.getRepository(Coupon).findOneByOrFail({ id: coupon.id }))
        .times_used,
    ).toBe(0);

    // Cancelar de nuevo no devuelve el stock dos veces.
    await setStatus(order.id, 'canceled').expect(409);
    expect(await stock()).toBe(10);
  });

  it('cancelar un pedido pagado avisa que hay que devolver el pago (el panel no lo toca)', async () => {
    const { order } = await placeGuestOrder();
    await db.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [
      order.id,
    ]);
    await setStatus(order.id, 'preparing').expect(200);
    const res = (await setStatus(order.id, 'canceled').expect(200))
      .body as OrderDetail;
    expect(res.payment.status).toBe('paid');
    expect(res.notice).toContain('devolvé el pago');
  });

  it('la nota interna no la ve el cliente y no hay forma de editar montos', async () => {
    const { order, accessToken } = await placeGuestOrder();
    const before = (
      await auth(request(server()).get(`/admin/orders/${order.id}`)).expect(200)
    ).body as OrderDetail;

    // Un monto junto a la nota se rechaza entero (forbidNonWhitelisted): ni la nota se guarda.
    await auth(request(server()).patch(`/admin/orders/${order.id}/note`))
      .send({ note: 'Llamar antes de ir', total: 1, subtotal: 1 })
      .expect(400);
    await auth(request(server()).patch(`/admin/orders/${order.id}/note`))
      .send({ note: 'Llamar antes de ir' })
      .expect(200);
    await auth(request(server()).patch(`/admin/orders/${order.id}`))
      .send({ total: 1 })
      .expect(404);
    await auth(request(server()).patch(`/admin/orders/${order.id}/status`))
      .send({ status: 'canceled', total: 1 })
      .expect(400);
    await auth(request(server()).patch(`/admin/orders/${order.id}/status`))
      .send({ status: 'canceled' })
      .expect(200);

    const after = (
      await auth(request(server()).get(`/admin/orders/${order.id}`)).expect(200)
    ).body as OrderDetail;
    expect(after.internal_note).toBe('Llamar antes de ir');
    expect(after.totals).toEqual(before.totals);

    const guestView = await request(server())
      .get(`/orders/guest/${order.id}`)
      .set('X-Order-Token', accessToken);
    expect(JSON.stringify(guestView.body)).not.toContain('Llamar antes');
  });

  it('lista con filtros por estado, número, email y fechas (en hora de Uruguay)', async () => {
    const first = (await placeGuestOrder(1)).order;
    const second = (await placeGuestOrder(1)).order;
    await setStatus(second.id, 'canceled').expect(200);
    // El primero se hizo "ayer" a las 23:30 de Montevideo (02:30 UTC de hoy).
    await db.query('UPDATE orders SET created_at = ? WHERE id = ?', [
      '2026-11-15 02:30:00',
      first.id,
    ]);
    await db.query('UPDATE orders SET created_at = ? WHERE id = ?', [
      '2026-11-15 03:30:00',
      second.id,
    ]);

    const list = async (query: string) =>
      (
        (
          await auth(request(server()).get(`/admin/orders?${query}`)).expect(
            200,
          )
        ).body as { items: { id: number }[]; total: number }
      ).items.map((o) => o.id);

    expect(await list('status=canceled')).toEqual([second.id]);
    expect(await list(`q=${first.id}`)).toEqual([first.id]);
    expect(await list('q=invitado@antojarte')).toEqual([second.id, first.id]);
    expect(await list('from=2026-11-14&to=2026-11-14')).toEqual([first.id]);
    expect(await list('from=2026-11-15&to=2026-11-15')).toEqual([second.id]);
    await auth(
      request(server()).get('/admin/orders?from=2026-11-16&to=2026-11-15'),
    ).expect(400);
    await auth(request(server()).get('/admin/orders?from=15/11/2026')).expect(
      400,
    );
    await auth(request(server()).get('/admin/orders?limit=500')).expect(400);
  });
});

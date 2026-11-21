import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  buyAndDeliver,
  createProduct,
  createTestApp,
  registerAdmin,
  registerUser,
  resetDatabase,
  TestApp,
} from './helpers';

interface Stats {
  periods: Record<
    'today' | 'last7Days' | 'last30Days',
    { orders: number; revenue: number }
  >;
  queues: { pendingPayment: number; toPrepare: number; preparing: number };
  daily: { day: string; orders: number; revenue: number }[];
  topProducts: { name: string; units: number }[];
  lowStock: { threshold: number; variants: { name: string; stock: number }[] };
  reviews: { last7Days: number };
}

describe('panel: resumen, reseñas y usuarios', () => {
  let app: TestApp;
  let db: DataSource;
  let token: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(async () => {
    await resetDatabase(db);
    token = (await registerAdmin(app, db)).token;
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

  it('resume ventas por período, colas, más vendidos, stock bajo y reseñas', async () => {
    const { variant } = await createProduct(db, 'top', 1000, 6);
    await createProduct(db, 'poco', 500, 2);
    const buyer = await registerUser(app, 'comprador@antua.test');
    const delivered = await buyAndDeliver(app, db, buyer.token, variant.id);
    const old = await buyAndDeliver(app, db, buyer.token, variant.id);
    // Uno de hace 10 días: cuenta en 30 días pero no en 7 ni hoy.
    await db.query(
      'UPDATE orders SET created_at = DATE_SUB(NOW(), INTERVAL 10 DAY) WHERE id = ?',
      [old],
    );
    await db.query("UPDATE orders SET status = 'preparing' WHERE id = ?", [
      delivered,
    ]);

    const stats = (
      await auth(request(server()).get('/admin/stats')).expect(200)
    ).body as Stats;
    expect(stats.periods.today.orders).toBe(1);
    expect(stats.periods.last7Days.orders).toBe(1);
    expect(stats.periods.last30Days.orders).toBe(2);
    expect(stats.periods.last30Days.revenue).toBeGreaterThan(
      stats.periods.today.revenue,
    );
    expect(stats.queues.preparing).toBe(1);
    expect(stats.daily).toHaveLength(30);
    expect(stats.daily.reduce((sum, d) => sum + d.orders, 0)).toBe(2);
    expect(stats.topProducts[0]).toMatchObject({
      name: 'Producto top',
      units: 2,
    });
    expect(stats.lowStock.threshold).toBe(5);
    expect(stats.lowStock.variants.map((v) => v.stock)).toEqual([2, 4]);
  });

  it('oculta una reseña (reversible): sale del listado público y del promedio', async () => {
    const { product, variant } = await createProduct(db, 'resenada');
    const buyer = await registerUser(app, 'autor@antua.test');
    await buyAndDeliver(app, db, buyer.token, variant.id);
    await request(server())
      .post(`/products/${product.slug}/reviews`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ rating: 1, comment: 'Spam spam spam' })
      .expect(201);

    const list = await auth(
      request(server()).get('/admin/reviews?q=spam'),
    ).expect(200);
    const [review] = (
      list.body as { items: { id: number; author: { name: string } }[] }
    ).items;
    expect(review.author.name).toBe('Usuario de Prueba');

    await auth(request(server()).patch(`/admin/reviews/${review.id}`))
      .send({ is_hidden: true })
      .expect(200);
    expect(
      (await request(server()).get(`/products/${product.slug}/reviews`)).body,
    ).toEqual([]);
    // El detalle ya no trae reseñas (se piden aparte): el comentario oculto no aparece por ningún lado.
    const detail = await request(server())
      .get(`/products/${product.slug}`)
      .expect(200);
    expect(JSON.stringify(detail.body)).not.toContain('Spam spam spam');
    const hidden = await auth(
      request(server()).get('/admin/reviews?hidden=true'),
    ).expect(200);
    expect((hidden.body as { total: number }).total).toBe(1);

    await auth(request(server()).patch(`/admin/reviews/${review.id}`))
      .send({ is_hidden: false })
      .expect(200);
    expect(
      (await request(server()).get(`/products/${product.slug}/reviews`)).body,
    ).toHaveLength(1);

    await auth(request(server()).delete(`/admin/reviews/${review.id}`)).expect(
      200,
    );
    const audit = await auth(
      request(server()).get(`/admin/audit?entity=review&entityId=${review.id}`),
    ).expect(200);
    expect(
      (audit.body as { items: { action: string }[] }).items.map(
        (a) => a.action,
      ),
    ).toEqual(['review.delete', 'review.show', 'review.hide']);
  });

  it('lista usuarios en solo lectura, sin hashes ni tokens', async () => {
    const buyer = await registerUser(app, 'cliente@antua.test');
    const { variant } = await createProduct(db, 'u');
    await buyAndDeliver(app, db, buyer.token, variant.id);

    const res = await auth(
      request(server()).get('/admin/users?q=cliente'),
    ).expect(200);
    const body = res.body as { items: Record<string, unknown>[] };
    expect(body.items).toEqual([
      expect.objectContaining({
        email: 'cliente@antua.test',
        role: 'customer',
        orders: 1,
      }),
    ]);
    expect(Object.keys(body.items[0]).sort()).toEqual([
      'created_at',
      'email',
      'full_name',
      'id',
      'orders',
      'role',
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash|token/i);

    const admins = await auth(
      request(server()).get('/admin/users?role=admin'),
    ).expect(200);
    expect((admins.body as { total: number }).total).toBe(1);
    // Sin edición: no hay PATCH ni DELETE.
    await auth(request(server()).patch(`/admin/users/${buyer.user.id}`))
      .send({ role: 'admin' })
      .expect(404);
  });
});

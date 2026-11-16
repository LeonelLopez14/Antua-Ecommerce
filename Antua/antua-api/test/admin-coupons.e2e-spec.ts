import request from 'supertest';
import { DataSource } from 'typeorm';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import {
  createCoupon,
  createTestApp,
  registerAdmin,
  resetDatabase,
  TestApp,
} from './helpers';

interface CouponView {
  id: number;
  code: string;
  status: string;
  times_used: number;
}

describe('panel: cupones', () => {
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

  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);
  const server = () => app.getHttpServer();
  const valid = {
    code: ' verano 20 ',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_amount: 3000,
    usage_limit: 100,
    valid_from: '2026-01-01T03:00:00.000Z',
    valid_until: '2030-01-01T03:00:00.000Z',
  };

  it('crea con el código normalizado y valida la coherencia', async () => {
    const res = await auth(request(server()).post('/admin/coupons'))
      .send(valid)
      .expect(201);
    expect(res.body).toMatchObject({
      code: 'VERANO20',
      status: 'active',
      times_used: 0,
    });

    await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, code: 'VERANO20' })
      .expect(409);
    await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, code: 'X1', discount_value: 150 })
      .expect(400);
    await auth(request(server()).post('/admin/coupons'))
      .send({
        ...valid,
        code: 'FECHAS',
        valid_until: '2025-01-01T00:00:00.000Z',
      })
      .expect(400);
    await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, code: 'NEG', usage_limit: -1 })
      .expect(400);
    await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, code: 'NEG2', min_order_amount: -5 })
      .expect(400);
    await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, code: 'a b' })
      .expect(400);
    // times_used no se puede mandar: la whitelist lo descarta.
    const sneaky = await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, code: 'TRAMPA', times_used: 50 })
      .expect(201);
    expect((sneaky.body as CouponView).times_used).toBe(0);
  });

  it('el cupón creado en el panel se puede aplicar en el carrito', async () => {
    await auth(request(server()).post('/admin/coupons'))
      .send({ ...valid, min_order_amount: null })
      .expect(201);
    const cart = await request(server())
      .post('/cart/coupon')
      .send({ couponCode: 'VERANO20' });
    expect(cart.status).toBe(201);
  });

  it('lista y filtra por estado y código', async () => {
    await createCoupon(db, 'ACTIVO');
    await createCoupon(db, 'APAGADO', { is_active: false });
    const res = await auth(
      request(server()).get('/admin/coupons?status=inactive'),
    ).expect(200);
    expect(
      (res.body as { items: CouponView[] }).items.map((c) => c.code),
    ).toEqual(['APAGADO']);
    const search = await auth(
      request(server()).get('/admin/coupons?q=act'),
    ).expect(200);
    expect(
      (search.body as { items: CouponView[] }).items.map((c) => c.code),
    ).toEqual(['ACTIVO']);
  });

  it('un cupón usado se desactiva en lugar de borrarse', async () => {
    const used = await createCoupon(db, 'USADO');
    await db.getRepository(Coupon).update(used.id, { times_used: 2 });
    const res = await auth(
      request(server()).delete(`/admin/coupons/${used.id}`),
    ).expect(200);
    expect(res.body).toMatchObject({ deleted: false, deactivated: true });
    expect(
      (await db.getRepository(Coupon).findOneByOrFail({ id: used.id }))
        .is_active,
    ).toBe(false);

    const fresh = await createCoupon(db, 'NUEVO');
    const deleted = await auth(
      request(server()).delete(`/admin/coupons/${fresh.id}`),
    ).expect(200);
    expect(deleted.body).toMatchObject({ deleted: true });
  });

  it('editar respeta las reglas con los valores que ya tenía', async () => {
    const created = await auth(request(server()).post('/admin/coupons'))
      .send(valid)
      .expect(201);
    const { id } = created.body as CouponView;
    await auth(request(server()).patch(`/admin/coupons/${id}`))
      .send({ valid_until: '2025-06-01T00:00:00.000Z' })
      .expect(400);
    const off = await auth(request(server()).patch(`/admin/coupons/${id}`))
      .send({ is_active: false })
      .expect(200);
    expect(off.body).toMatchObject({ status: 'inactive' });
    const audit = await auth(
      request(server()).get(`/admin/audit?entity=coupon&entityId=${id}`),
    ).expect(200);
    expect(
      (audit.body as { items: { action: string }[] }).items.map(
        (a) => a.action,
      ),
    ).toEqual(['coupon.update', 'coupon.create']);
  });
});

import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createCoupon,
  createProduct,
  createTestApp,
  newGuestToken,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

interface CartBody {
  cart: { items: { id: number }[]; coupon: { code: string } | null };
  summary: { shippingEtaDays: number | null };
  warnings: { code: string; couponCode: string; minAmount: number }[];
}

describe('respuesta del carrito', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const addItem = async (
    token: string,
    variantId: number,
    quantity: number,
  ) => {
    const res = await request(app.getHttpServer())
      .post('/cart/items')
      .set('X-Guest-Token', token)
      .send({ variantId, quantity })
      .expect(201);
    return res.body as CartBody;
  };

  it('avisa una vez cuando el cupón se retira por no llegar al mínimo', async () => {
    const { variant } = await createProduct(db, 'a', 1000);
    await createCoupon(db, 'MIN2000', { min_order_amount: 2000 });
    const token = await newGuestToken(app);
    const { cart } = await addItem(token, variant.id, 3);
    await request(app.getHttpServer())
      .post('/cart/coupon')
      .set('X-Guest-Token', token)
      .send({ couponCode: 'MIN2000' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/cart/items/${cart.items[0].id}`)
      .set('X-Guest-Token', token)
      .send({ quantity: 1 })
      .expect(200);

    const body = updated.body as CartBody;
    expect(body.cart.coupon).toBeNull();
    expect(body.warnings).toEqual([
      expect.objectContaining({
        code: 'COUPON_REMOVED_MIN_NOT_MET',
        couponCode: 'MIN2000',
        minAmount: 2000,
      }),
    ]);

    const again = await request(app.getHttpServer())
      .get('/cart')
      .set('X-Guest-Token', token)
      .expect(200);
    expect((again.body as CartBody).warnings).toEqual([]);
  });

  it('informa el plazo de envío en el carrito y lo guarda en el pedido', async () => {
    const { variant } = await createProduct(db, 'a');
    const token = await newGuestToken(app);
    const body = await addItem(token, variant.id, 1);
    expect(body.summary.shippingEtaDays).toBe(3);

    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('X-Guest-Token', token)
      .send({ ...SHIPPING_DATA, guest_email: 'a@antua.test' })
      .expect(201);
    expect(
      (res.body as { order: { shipping_eta_days: number } }).order
        .shipping_eta_days,
    ).toBe(3);
  });
});

import request from 'supertest';
import { DataSource } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import {
  createProduct,
  createTestApp,
  newGuestToken,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

const GUEST_ORDER = { ...SHIPPING_DATA, guest_email: 'invitado@antua.test' };

describe('POST /orders', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const server = () => app.getHttpServer();

  const guestCartWith = async (variantId: number, quantity = 2) => {
    const token = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', token)
      .send({ variantId, quantity })
      .expect(201);
    return token;
  };

  it('cobra el precio del carrito si no cambió', async () => {
    const { variant } = await createProduct(db, 'a', 1000);
    const token = await guestCartWith(variant.id);

    const res = await request(server())
      .post('/orders')
      .set('X-Guest-Token', token)
      .send(GUEST_ORDER)
      .expect(201);

    const body = res.body as { order: { subtotal: number; total: number } };
    expect(body.order.subtotal).toBe(2000);
    expect(body.order.total).toBe(3500);
  });

  describe('si el precio cambió después de agregarlo', () => {
    it('responde 409 con los precios nuevos, sin crear el pedido ni tocar el stock', async () => {
      const { variant, product } = await createProduct(db, 'a', 1000, 10);
      const token = await guestCartWith(variant.id);
      await db
        .getRepository(ProductVariant)
        .update(variant.id, { price: 1200 });

      const res = await request(server())
        .post('/orders')
        .set('X-Guest-Token', token)
        .send(GUEST_ORDER)
        .expect(409);

      expect(res.body).toMatchObject({
        code: 'PRICE_CHANGED',
        changes: [
          {
            variantId: variant.id,
            productName: product.name,
            variantName: 'x1',
            oldPrice: 1000,
            newPrice: 1200,
          },
        ],
      });
      expect(await db.getRepository(Order).count()).toBe(0);
      const stored = await db.getRepository(ProductVariant).findOneByOrFail({
        id: variant.id,
      });
      expect(stored.stock).toBe(10);
    });

    it('actualiza el carrito y deja confirmar con el precio nuevo', async () => {
      const { variant } = await createProduct(db, 'a', 1000, 10);
      const token = await guestCartWith(variant.id);
      await db
        .getRepository(ProductVariant)
        .update(variant.id, { price: 1200 });
      await request(server())
        .post('/orders')
        .set('X-Guest-Token', token)
        .send(GUEST_ORDER)
        .expect(409);

      const cart = await request(server())
        .get('/cart')
        .set('X-Guest-Token', token)
        .expect(200);
      expect(
        (cart.body as { summary: { subtotal: number } }).summary.subtotal,
      ).toBe(2400);

      const res = await request(server())
        .post('/orders')
        .set('X-Guest-Token', token)
        .send(GUEST_ORDER)
        .expect(201);
      expect((res.body as { order: { subtotal: number } }).order.subtotal).toBe(
        2400,
      );
    });
  });

  it('rechaza un producto que dejó de estar a la venta', async () => {
    const { variant } = await createProduct(db, 'a');
    const token = await guestCartWith(variant.id);
    await db
      .getRepository(ProductVariant)
      .update(variant.id, { is_active: false });

    await request(server())
      .post('/orders')
      .set('X-Guest-Token', token)
      .send(GUEST_ORDER)
      .expect(400);
  });
});

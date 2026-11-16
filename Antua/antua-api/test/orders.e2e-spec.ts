import request from 'supertest';
import { DataSource } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import {
  createProduct,
  createTestApp,
  newGuestToken,
  registerUser,
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

  describe('pedidos de invitado', () => {
    const placeGuestOrder = async (email = 'invitado@antua.test') => {
      const { variant } = await createProduct(db, `p-${Date.now()}`);
      const token = await guestCartWith(variant.id, 1);
      const res = await request(server())
        .post('/orders')
        .set('X-Guest-Token', token)
        .send({ ...SHIPPING_DATA, guest_email: email })
        .expect(201);
      return res.body as { order: { id: number }; accessToken: string };
    };

    it('no devuelve el hash del token en ninguna respuesta', async () => {
      const { order, accessToken } = await placeGuestOrder();
      expect(accessToken).toEqual(expect.any(String));
      expect(JSON.stringify(order)).not.toContain('guest_access_token_hash');

      const res = await request(server())
        .get(`/orders/guest/${order.id}`)
        .set('X-Order-Token', accessToken)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('guest_access_token_hash');
    });

    it('no deja ver el pedido sabiendo solo el email', async () => {
      const { order } = await placeGuestOrder();
      await request(server())
        .get(`/orders/guest/${order.id}?email=invitado@antua.test`)
        .expect(404);
    });

    it('registrarse con el mismo email NO da acceso al pedido', async () => {
      const { order } = await placeGuestOrder('victima@antua.test');
      const attacker = await registerUser(app, 'victima@antua.test');

      await request(server())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${attacker.token}`)
        .expect(404);
      await request(server())
        .post(`/orders/${order.id}/claim`)
        .set('Authorization', `Bearer ${attacker.token}`)
        .expect(404);
    });

    it('otro usuario no puede reclamarlo con un token equivocado', async () => {
      const { order } = await placeGuestOrder();
      const other = await registerUser(app, 'otro@antua.test');

      await request(server())
        .post(`/orders/${order.id}/claim`)
        .set('Authorization', `Bearer ${other.token}`)
        .set('X-Order-Token', 'token-inventado')
        .expect(404);
    });

    it('con el token, lo vincula a la cuenta una sola vez', async () => {
      const { order, accessToken } = await placeGuestOrder();
      const user = await registerUser(app, 'duena@antua.test');
      const other = await registerUser(app, 'otra@antua.test');

      await request(server())
        .post(`/orders/${order.id}/claim`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Order-Token', accessToken)
        .expect(200);

      const list = await request(server())
        .get('/orders')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      expect(list.body).toHaveLength(1);

      // El token ya no sirve: ni para otro usuario ni para verlo como invitado.
      await request(server())
        .post(`/orders/${order.id}/claim`)
        .set('Authorization', `Bearer ${other.token}`)
        .set('X-Order-Token', accessToken)
        .expect(404);
      await request(server())
        .get(`/orders/guest/${order.id}`)
        .set('X-Order-Token', accessToken)
        .expect(404);
    });

    it('no se puede reclamar pasado el plazo', async () => {
      const { order, accessToken } = await placeGuestOrder();
      const user = await registerUser(app, 'tarde@antua.test');
      await db.query(
        'UPDATE orders SET created_at = DATE_SUB(NOW(), INTERVAL 2 DAY) WHERE id = ?',
        [order.id],
      );

      await request(server())
        .post(`/orders/${order.id}/claim`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Order-Token', accessToken)
        .expect(404);
    });
  });
});

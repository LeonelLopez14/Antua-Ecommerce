import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createProduct,
  createTestApp,
  newGuestToken,
  registerUser,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

const ADMIN_KEY = 'clave-de-prueba-para-los-e2e';

describe('endurecimiento', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const product = {
    name: 'Nuevo',
    slug: 'nuevo',
    ingredients: 'x',
    allergens: 'x',
    description: 'x',
    base_price: 100,
    is_active: true,
  };

  it('GET /health informa el estado de la base', async () => {
    const res = await request(server()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('las escrituras del catálogo exigen la clave de administración', async () => {
    await request(server()).post('/products').send(product).expect(403);
    await request(server())
      .post('/products')
      .set('X-Admin-Key', 'equivocada')
      .send(product)
      .expect(403);
    await request(server()).delete('/products/1').expect(403);
    await request(server())
      .post('/tags')
      .send({ name: 'a', slug: 'a' })
      .expect(403);
    await request(server())
      .post('/products')
      .set('X-Admin-Key', ADMIN_KEY)
      .send(product)
      .expect(201);
  });

  it('envía cabeceras de seguridad y no permite orígenes ajenos', async () => {
    const res = await request(server())
      .get('/products')
      .set('Origin', 'https://malicioso.test')
      .expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();

    const allowed = await request(server())
      .get('/products')
      .set('Origin', 'https://tienda.ejemplo.test')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://tienda.ejemplo.test',
    );
  });

  it('el registro aplica la política de contraseñas', async () => {
    await request(server())
      .post('/auth/register')
      .send({ full_name: 'A', email: 'a@antua.test', password: 'sinnumeros' })
      .expect(400);
  });

  it('rechaza cantidades no enteras y textos demasiado largos', async () => {
    const { variant } = await createProduct(db, 'a');
    const token = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', token)
      .send({ variantId: variant.id, quantity: 1.5 })
      .expect(400);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', token)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);
    await request(server())
      .post('/orders')
      .set('X-Guest-Token', token)
      .send({
        ...SHIPPING_DATA,
        guest_email: 'a@antua.test',
        shipping_postal_code: '1'.repeat(21),
      })
      .expect(400);
  });

  describe('ownership', () => {
    it('un usuario no ve ni toca pedidos ni direcciones de otro', async () => {
      const { variant } = await createProduct(db, 'a');
      const owner = await registerUser(app, 'duena@antua.test');
      const other = await registerUser(app, 'otra@antua.test');
      const bearer = (token: string) => `Bearer ${token}`;

      await request(server())
        .post('/cart/items')
        .set('Authorization', bearer(owner.token))
        .send({ variantId: variant.id, quantity: 1 })
        .expect(201);
      const order = await request(server())
        .post('/orders')
        .set('Authorization', bearer(owner.token))
        .send(SHIPPING_DATA)
        .expect(201);
      const orderId = (order.body as { order: { id: number } }).order.id;
      await request(server())
        .get(`/orders/${orderId}`)
        .set('Authorization', bearer(other.token))
        .expect(404);

      const address = await request(server())
        .post('/addresses')
        .set('Authorization', bearer(owner.token))
        .send({
          street: 'Calle 1',
          city: 'Montevideo',
          postal_code: '11200',
          country: 'Uruguay',
        })
        .expect(201);
      const addressId = (address.body as { id: number }).id;
      const calls = [
        () => request(server()).get(`/addresses/${addressId}`),
        () =>
          request(server())
            .patch(`/addresses/${addressId}`)
            .send({ city: 'X' }),
        () => request(server()).patch(`/addresses/${addressId}/default`),
        () => request(server()).delete(`/addresses/${addressId}`),
      ];
      for (const call of calls) {
        await call().set('Authorization', bearer(other.token)).expect(404);
      }
    });

    it('nadie puede vaciar el carrito de otro invitado con su id de ítem', async () => {
      const { variant } = await createProduct(db, 'a');
      const victim = await newGuestToken(app);
      const attacker = await newGuestToken(app);
      const cart = await request(server())
        .post('/cart/items')
        .set('X-Guest-Token', victim)
        .send({ variantId: variant.id, quantity: 1 })
        .expect(201);
      const itemId = (cart.body as { cart: { items: { id: number }[] } }).cart
        .items[0].id;
      await request(server())
        .delete(`/cart/items/${itemId}`)
        .set('X-Guest-Token', attacker)
        .expect(404);
    });
  });

  it('limita los intentos de login', async () => {
    // Los e2e desactivan el límite con NODE_ENV=test; acá se reactiva.
    process.env.NODE_ENV = 'e2e-rate-limit';
    try {
      const attempts: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await request(server())
          .post('/auth/login')
          .send({ email: 'a@antua.test', password: 'x' });
        attempts.push(res.status);
      }
      expect(attempts.slice(0, 10).every((status) => status === 401)).toBe(
        true,
      );
      expect(attempts.at(-1)).toBe(429);
    } finally {
      process.env.NODE_ENV = 'test';
    }
  });
});

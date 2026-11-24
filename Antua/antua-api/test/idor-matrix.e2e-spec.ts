import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  buyAndDeliver,
  createProduct,
  createTestApp,
  listRoutes,
  registerUser,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

/**
 * Matriz de IDOR: para CADA ruta que recibe un id (o un slug), la usuaria A intenta usar un recurso
 * de B, alguien sin sesión lo intenta también, y B lo usa de verdad (si B no pudiera, el 404 de A no
 * probaría nada).
 *
 * Política:
 * - Recurso de otra persona: 404 (no 403), así no se confirma que el id existe.
 * - Sin sesión: 401 en las rutas que exigen cuenta. Las que también aceptan un invitado (carrito,
 *   pago del pedido) responden 404 sin el token correcto: un invitado sin token es anónimo.
 * - /admin: el admin ve todo, no hay "recursos de otro admin". Su matriz de 401/403 sobre TODAS las
 *   rutas está en admin-auth.e2e-spec.ts y se arma sola con las rutas registradas.
 *
 * El primer test falla si aparece una ruta con parámetros que no está en la matriz, o si la matriz
 * nombra una ruta que ya no existe.
 *
 * Además, cada respuesta se compara contra una lista de campos permitidos y otra de prohibidos.
 */

type Who = { jwt?: string; guest?: string; order?: string };
type Method = 'get' | 'post' | 'patch' | 'delete';
interface Probe {
  method: Method;
  path: string;
  body?: object;
  owner: Who;
  attacker: Who;
  /** Lo que recibe alguien sin credenciales. */
  anonymous: 401 | 404;
  /** Estado esperado para la dueña. */
  ownerStatus: number;
}
interface Case {
  /** Público: no hay dueño, cualquiera puede leerlo. */
  public?: true;
  setup: (ctx: Context) => Promise<Probe>;
}
interface Context {
  app: TestApp;
  db: DataSource;
  a: { token: string; user: { id: number } };
  b: { token: string; user: { id: number } };
}

const server = (ctx: Context) => ctx.app.getHttpServer();
const send = (ctx: Context, probe: Probe, who: Who) => {
  let req = request(server(ctx))[probe.method](probe.path);
  if (who.jwt) req = req.set('Authorization', `Bearer ${who.jwt}`);
  if (who.guest) req = req.set('X-Guest-Token', who.guest);
  if (who.order) req = req.set('X-Order-Token', who.order);
  return probe.body ? req.send(probe.body) : req;
};

async function addressOf(ctx: Context, token: string) {
  const res = await request(server(ctx))
    .post('/addresses')
    .set('Authorization', `Bearer ${token}`)
    .send({
      street: 'Calle 1',
      city: 'Montevideo',
      postal_code: '11200',
      country: 'Uruguay',
    })
    .expect(201);
  return (res.body as { id: number }).id;
}

let productCounter = 0;
async function product(ctx: Context) {
  productCounter += 1;
  return createProduct(ctx.db, `idor-${productCounter}`);
}

/** Ítem en el carrito de B. `asGuest`: carrito de invitado (por token) en vez del de la cuenta. */
async function cartItemOf(ctx: Context, asGuest: boolean) {
  const { variant } = await product(ctx);
  let guest: string | undefined;
  if (asGuest) {
    const cart = await request(server(ctx)).get('/cart').expect(200);
    guest = String(cart.headers['x-guest-token']);
  }
  let req = request(server(ctx)).post('/cart/items');
  req = guest
    ? req.set('X-Guest-Token', guest)
    : req.set('Authorization', `Bearer ${ctx.b.token}`);
  const res = await req
    .send({ variantId: variant.id, quantity: 1 })
    .expect(201);
  const items = (res.body as { cart: { items: { id: number }[] } }).cart.items;
  return { itemId: items[items.length - 1].id, guest };
}

/** Pedido de B con cuenta (pendiente de pago). */
async function orderOf(ctx: Context) {
  const { variant } = await product(ctx);
  await request(server(ctx))
    .post('/cart/items')
    .set('Authorization', `Bearer ${ctx.b.token}`)
    .send({ variantId: variant.id, quantity: 1 })
    .expect(201);
  const res = await request(server(ctx))
    .post('/orders')
    .set('Authorization', `Bearer ${ctx.b.token}`)
    .send(SHIPPING_DATA)
    .expect(201);
  return (res.body as { order: { id: number } }).order.id;
}

/** Pedido de invitado, con su token de acceso. */
async function guestOrder(ctx: Context) {
  const { variant } = await product(ctx);
  const cart = await request(server(ctx)).get('/cart').expect(200);
  const guest = String(cart.headers['x-guest-token']);
  await request(server(ctx))
    .post('/cart/items')
    .set('X-Guest-Token', guest)
    .send({ variantId: variant.id, quantity: 1 })
    .expect(201);
  const res = await request(server(ctx))
    .post('/orders')
    .set('X-Guest-Token', guest)
    .send({ ...SHIPPING_DATA, guest_email: 'invitada@antojarte.example' })
    .expect(201);
  const body = res.body as { order: { id: number }; accessToken: string };
  return { id: body.order.id, accessToken: body.accessToken };
}

/** Reseña de B sobre un producto que compró y recibió. */
async function reviewOf(ctx: Context) {
  const { product: p, variant } = await product(ctx);
  await buyAndDeliver(ctx.app, ctx.db, ctx.b.token, variant.id);
  const res = await request(server(ctx))
    .post(`/products/${p.slug}/reviews`)
    .set('Authorization', `Bearer ${ctx.b.token}`)
    .send({ rating: 5, comment: 'Muy rica' })
    .expect(201);
  return { slug: p.slug, id: (res.body as { id: number }).id };
}

const MATRIX: Record<string, Case> = {
  'GET /addresses/:id': {
    setup: async (ctx) => ({
      method: 'get',
      path: `/addresses/${await addressOf(ctx, ctx.b.token)}`,
      owner: { jwt: ctx.b.token },
      attacker: { jwt: ctx.a.token },
      anonymous: 401,
      ownerStatus: 200,
    }),
  },
  'PATCH /addresses/:id': {
    setup: async (ctx) => ({
      method: 'patch',
      path: `/addresses/${await addressOf(ctx, ctx.b.token)}`,
      body: { city: 'Paysandú' },
      owner: { jwt: ctx.b.token },
      attacker: { jwt: ctx.a.token },
      anonymous: 401,
      ownerStatus: 200,
    }),
  },
  'PATCH /addresses/:id/default': {
    setup: async (ctx) => ({
      method: 'patch',
      path: `/addresses/${await addressOf(ctx, ctx.b.token)}/default`,
      owner: { jwt: ctx.b.token },
      attacker: { jwt: ctx.a.token },
      anonymous: 401,
      ownerStatus: 200,
    }),
  },
  'DELETE /addresses/:id': {
    setup: async (ctx) => ({
      method: 'delete',
      path: `/addresses/${await addressOf(ctx, ctx.b.token)}`,
      owner: { jwt: ctx.b.token },
      attacker: { jwt: ctx.a.token },
      anonymous: 401,
      ownerStatus: 200,
    }),
  },
  'PATCH /cart/items/:id': {
    setup: async (ctx) => {
      const { itemId } = await cartItemOf(ctx, false);
      return {
        method: 'patch',
        path: `/cart/items/${itemId}`,
        body: { quantity: 2 },
        owner: { jwt: ctx.b.token },
        attacker: { jwt: ctx.a.token },
        anonymous: 404,
        ownerStatus: 200,
      };
    },
  },
  'DELETE /cart/items/:id': {
    setup: async (ctx) => {
      // Carrito de invitado: la atacante tiene su propio token de invitado.
      const { itemId, guest } = await cartItemOf(ctx, true);
      const other = await request(server(ctx)).get('/cart').expect(200);
      return {
        method: 'delete',
        path: `/cart/items/${itemId}`,
        owner: { guest },
        attacker: { guest: String(other.headers['x-guest-token']) },
        anonymous: 404,
        ownerStatus: 200,
      };
    },
  },
  'GET /orders/:id': {
    setup: async (ctx) => ({
      method: 'get',
      path: `/orders/${await orderOf(ctx)}`,
      owner: { jwt: ctx.b.token },
      attacker: { jwt: ctx.a.token },
      anonymous: 401,
      ownerStatus: 200,
    }),
  },
  'GET /orders/guest/:id': {
    setup: async (ctx) => {
      const order = await guestOrder(ctx);
      return {
        method: 'get',
        path: `/orders/guest/${order.id}`,
        owner: { order: order.accessToken },
        attacker: { order: 'token-inventado', jwt: ctx.a.token },
        anonymous: 404,
        ownerStatus: 200,
      };
    },
  },
  'POST /orders/:id/claim': {
    setup: async (ctx) => {
      const order = await guestOrder(ctx);
      return {
        method: 'post',
        path: `/orders/${order.id}/claim`,
        // "Dueña" es quien tiene el token del correo; la atacante tiene cuenta pero no el token.
        owner: { jwt: ctx.b.token, order: order.accessToken },
        attacker: { jwt: ctx.a.token },
        anonymous: 401,
        ownerStatus: 200,
      };
    },
  },
  'POST /orders/:id/payment': {
    setup: async (ctx) => ({
      method: 'post',
      path: `/orders/${await orderOf(ctx)}/payment`,
      owner: { jwt: ctx.b.token },
      attacker: { jwt: ctx.a.token },
      anonymous: 404,
      ownerStatus: 201,
    }),
  },
  'GET /orders/:id/payment': {
    setup: async (ctx) => {
      const id = await orderOf(ctx);
      await request(server(ctx))
        .post(`/orders/${id}/payment`)
        .set('Authorization', `Bearer ${ctx.b.token}`)
        .expect(201);
      return {
        method: 'get',
        path: `/orders/${id}/payment`,
        owner: { jwt: ctx.b.token },
        attacker: { jwt: ctx.a.token },
        anonymous: 404,
        ownerStatus: 200,
      };
    },
  },
  'POST /orders/:id/payment/retry': {
    setup: async (ctx) => {
      // Pedido de invitado: la atacante prueba con su cuenta y con un token inventado.
      const order = await guestOrder(ctx);
      await request(server(ctx))
        .post(`/orders/${order.id}/payment`)
        .set('X-Order-Token', order.accessToken)
        .expect(201);
      return {
        method: 'post',
        path: `/orders/${order.id}/payment/retry`,
        owner: { order: order.accessToken },
        attacker: { jwt: ctx.a.token, order: 'token-inventado' },
        anonymous: 404,
        ownerStatus: 201,
      };
    },
  },
  'PATCH /products/:slug/reviews/:id': {
    setup: async (ctx) => {
      const review = await reviewOf(ctx);
      return {
        method: 'patch',
        path: `/products/${review.slug}/reviews/${review.id}`,
        body: { rating: 4 },
        owner: { jwt: ctx.b.token },
        attacker: { jwt: ctx.a.token },
        anonymous: 401,
        ownerStatus: 200,
      };
    },
  },
  'DELETE /products/:slug/reviews/:id': {
    setup: async (ctx) => {
      const review = await reviewOf(ctx);
      return {
        method: 'delete',
        path: `/products/${review.slug}/reviews/${review.id}`,
        owner: { jwt: ctx.b.token },
        attacker: { jwt: ctx.a.token },
        anonymous: 401,
        ownerStatus: 204,
      };
    },
  },
  // Crear una reseña no apunta a un recurso de otra persona; exige cuenta y una compra recibida.
  'POST /products/:slug/reviews': {
    setup: async (ctx) => {
      const { product: p, variant } = await product(ctx);
      await buyAndDeliver(ctx.app, ctx.db, ctx.b.token, variant.id);
      return {
        method: 'post',
        path: `/products/${p.slug}/reviews`,
        body: { rating: 5 },
        owner: { jwt: ctx.b.token },
        // A no compró ese producto: no puede reseñarlo.
        attacker: { jwt: ctx.a.token },
        anonymous: 401,
        ownerStatus: 201,
      };
    },
  },
  'GET /products/:slug': {
    public: true,
    setup: async (ctx) => ({
      method: 'get',
      path: `/products/${(await product(ctx)).product.slug}`,
      owner: {},
      attacker: {},
      anonymous: 404,
      ownerStatus: 200,
    }),
  },
  'GET /products/:slug/reviews': {
    public: true,
    setup: async (ctx) => ({
      method: 'get',
      path: `/products/${(await reviewOf(ctx)).slug}/reviews`,
      owner: {},
      attacker: {},
      anonymous: 404,
      ownerStatus: 200,
    }),
  },
  'GET /tags/:id': {
    public: true,
    setup: async (ctx) => {
      const [tag] = await ctx.db
        .query<{ id: number }[]>(
          "INSERT INTO tags (name, slug) VALUES ('Clásicas', 'clasicas') RETURNING id",
        )
        .catch(async () => {
          await ctx.db.query(
            "INSERT INTO tags (name, slug) VALUES ('Clásicas', 'clasicas')",
          );
          return ctx.db.query<{ id: number }[]>(
            "SELECT id FROM tags WHERE slug = 'clasicas'",
          );
        });
      return {
        method: 'get',
        path: `/tags/${tag.id}`,
        owner: {},
        attacker: {},
        anonymous: 404,
        ownerStatus: 200,
      };
    },
  },
};

/** Campos que ninguna respuesta pública o de cliente puede tener, en ningún nivel. */
const FORBIDDEN_FIELDS = [
  'password',
  'password_hash',
  'password_changed_at',
  'guest_access_token_hash',
  'token_hash',
  'guest_token',
  'internal_note',
  'admin',
  'changes',
  'mp_payment_id',
  'raw',
];

/**
 * Todos los campos que puede devolver la API a una clienta o al público. Uno nuevo hace fallar el
 * test: hay que revisarlo y agregarlo a propósito.
 */
// email, phone, token y role solo aparecen en los datos de la propia cuenta (/auth/me, /users/me,
// el JWT del login). De otras personas solo se ve user.{id, full_name} en las reseñas.
const ALLOWED_FIELDS = new Set<string>([
  'allergens',
  'base_price',
  'canPay',
  'cart',
  'city',
  'comment',
  'country',
  'coupon',
  'created_at',
  'description',
  'discount',
  'discount_amount',
  'email',
  'enabled',
  'full_name',
  'guest_email',
  'id',
  'images',
  'ingredients',
  'is_active',
  'is_default',
  'is_hidden',
  'items',
  'label',
  'name',
  'nutrition_info',
  'orderId',
  'orderStatus',
  'paymentStatus',
  'payment_expires_at',
  'payment_status',
  'phone',
  'postal_code',
  'price',
  'product',
  'productTags',
  'product_name_snapshot',
  'quantity',
  'rating',
  'redirectUrl',
  'role',
  'shipping',
  'shippingEtaDays',
  'shipping_amount',
  'shipping_city',
  'shipping_eta_days',
  'shipping_full_name',
  'shipping_phone',
  'shipping_postal_code',
  'shipping_street',
  'sku',
  'slug',
  'status',
  'stock',
  'street',
  'subtotal',
  'summary',
  'token',
  'total',
  'unit_price_snapshot',
  'user',
  'variant',
  'variants',
  'warnings',
]);

function collectKeys(value: unknown, into: Set<string>) {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, into));
  else if (value && typeof value === 'object')
    for (const [key, inner] of Object.entries(value)) {
      into.add(key);
      collectKeys(inner, into);
    }
}

describe('matriz de IDOR y campos de las respuestas', () => {
  const ctx = {} as Context;
  const seenKeys = new Set<string>();

  beforeAll(async () => {
    const { app, db } = await createTestApp();
    Object.assign(ctx, { app, db });
    await resetDatabase(db);
    ctx.a = await registerUser(app, 'ana@antojarte.example');
    ctx.b = await registerUser(app, 'bea@antojarte.example');
  });
  afterAll(() => ctx.app.close());

  it('cubre todas las rutas con parámetros (fuera de /admin) y solo rutas que existen', () => {
    const withParams = listRoutes(ctx.app)
      .filter((r) => r.path.includes(':') && !r.path.startsWith('/admin'))
      .map((r) => `${r.method.toUpperCase()} ${r.path}`)
      .sort();
    expect(Object.keys(MATRIX).sort()).toEqual(withParams);
  });

  for (const [route, testCase] of Object.entries(MATRIX)) {
    it(route, async () => {
      const probe = await testCase.setup(ctx);
      if (!testCase.public) {
        const attacker = await send(ctx, probe, probe.attacker);
        expect([403, 404]).toContain(attacker.status);
        const anonymous = await send(ctx, probe, {});
        expect(anonymous.status).toBe(probe.anonymous);
      }
      const owner = await send(ctx, probe, probe.owner);
      expect(owner.status).toBe(probe.ownerStatus);
      collectKeys(owner.body, seenKeys);
    });
  }

  it('las respuestas de cliente y públicas no tienen campos prohibidos ni desconocidos', async () => {
    // Además de las de la matriz, las rutas sin id que devuelven datos.
    const order = await guestOrder(ctx);
    const reads: [string, Who][] = [
      ['/auth/me', { jwt: ctx.b.token }],
      ['/users/me', { jwt: ctx.b.token }],
      ['/addresses', { jwt: ctx.b.token }],
      ['/orders', { jwt: ctx.b.token }],
      ['/cart', { jwt: ctx.b.token }],
      ['/products', {}],
      ['/tags', {}],
      ['/payments/config', {}],
      [`/orders/guest/${order.id}`, { order: order.accessToken }],
    ];
    for (const [path, who] of reads) {
      const res = await send(
        ctx,
        {
          method: 'get',
          path,
          owner: who,
          attacker: {},
          anonymous: 401,
          ownerStatus: 200,
        },
        who,
      ).expect(200);
      collectKeys(res.body, seenKeys);
    }
    const login = await request(server(ctx))
      .post('/auth/login')
      .send({ email: 'bea@antojarte.example', password: 'ClaveSegura123' })
      .expect(201);
    collectKeys(login.body, seenKeys);

    const forbidden = [...seenKeys].filter((key) =>
      FORBIDDEN_FIELDS.includes(key),
    );
    expect(forbidden).toEqual([]);
    const unknown = [...seenKeys]
      .filter((key) => !ALLOWED_FIELDS.has(key))
      .sort();
    if (unknown.length)
      process.stdout.write(`CAMPOS ${JSON.stringify(unknown)}\n`);
    expect(unknown).toEqual([]);
  });
});

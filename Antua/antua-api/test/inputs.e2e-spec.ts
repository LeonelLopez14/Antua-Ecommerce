import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createProduct,
  createTestApp,
  registerAdmin,
  registerUser,
  resetDatabase,
  TestApp,
} from './helpers';

/**
 * Entradas hostiles: orden y filtros, números, tipos y tamaños, subidas y HTML guardado. Ninguna
 * debe dar 500, cambiar la consulta ni guardar algo que después se ejecute. Las fórmulas en CSV
 * están en admin-exports.e2e-spec.ts; los campos de más (asignación masiva), en los tests de cada
 * módulo (forbidNonWhitelisted).
 */
describe('entradas hostiles', () => {
  let app: TestApp;
  let db: DataSource;
  let customer: string;
  let admin: string;
  let variantId: number;
  let productId: number;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    await resetDatabase(db);
    const { product, variant } = await createProduct(db, 'clasica');
    productId = product.id;
    variantId = variant.id;
    customer = (await registerUser(app, 'ana@antojarte.example')).token;
    admin = (await registerAdmin(app, db)).token;
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const bearer = (token: string) => `Bearer ${token}`;

  it('orden y filtros del catálogo: lista blanca, nada de SQL ni operadores', async () => {
    const rejected = [
      'sort=price;DROP TABLE users',
      'sort=__proto__',
      'sort=name%20DESC',
      "q=' OR 1=1 --",
      'page=-1',
      'page=abc',
      'page=1e309',
      'limit=0',
      'limit=1000000',
      'minPrice=-5',
      'minPrice=NaN',
      'maxPrice=1e400',
      "categories=a'b",
      'categories[]=x&categories[$gt]=',
    ];
    for (const query of rejected) {
      const res = await request(server()).get(`/products?${query}`);
      expect({ query, status: res.status }).toEqual({ query, status: 400 });
    }
    // Una página enorme no rompe: devuelve la última.
    await request(server())
      .get('/products?page=99999999999999999999')
      .expect(200);
    // La tabla sigue ahí.
    const [{ total }] = await db.query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM users',
    );
    expect(Number(total)).toBe(2);
  });

  it('orden y búsqueda del panel: lista blanca y consultas parametrizadas', async () => {
    for (const query of [
      'sort=id;DROP',
      'order=sideways',
      'page=-3',
      'limit=999999',
    ]) {
      await request(server())
        .get(`/admin/products?${query}`)
        .set('Authorization', bearer(admin))
        .expect(400);
    }
    // Una comilla en la búsqueda es solo texto: no trae productos de más.
    const res = await request(server())
      .get(`/admin/products?q=${encodeURIComponent("' OR '1'='1")}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect((res.body as { items: unknown[] }).items).toEqual([]);
    await request(server())
      .get('/admin/orders?from=2026-13-45')
      .set('Authorization', bearer(admin))
      .expect(400);
  });

  it('números negativos, desbordados y tipos equivocados', async () => {
    const add = (body: unknown) =>
      request(server())
        .post('/cart/items')
        .set('Authorization', bearer(customer))
        .send(body as object);
    await add({ variantId, quantity: 'abc' }).expect(400);
    await add({ variantId, quantity: -1 }).expect(400);
    await add({ variantId, quantity: 0 }).expect(400);
    await add({ variantId, quantity: 1.5 }).expect(400);
    await add({ variantId, quantity: 1e20 }).expect(400);
    await add({ variantId: '1 OR 1=1', quantity: 1 }).expect(400);
    await add({ variantId: 2 ** 31, quantity: 1 }).expect(404);
    await add([1, 2]).expect(400);
    // Inyección de operadores (estilo NoSQL): un objeto donde va un email.
    await request(server())
      .post('/auth/login')
      .send({ email: { $gt: '' }, password: 'x' })
      .expect(400);
  });

  it('cadenas enormes y cuerpos demasiado grandes', async () => {
    await request(server())
      .post('/auth/register')
      .send({
        full_name: 'A'.repeat(50_000),
        email: 'larga@antojarte.example',
        password: 'ClaveSegura123',
      })
      .expect(400);
    await request(server())
      .post('/addresses')
      .set('Authorization', bearer(customer))
      .send({
        street: 'x'.repeat(10_000),
        city: 'Montevideo',
        postal_code: '11000',
        country: 'Uruguay',
      })
      .expect(400);
    // Más que el límite del parser de JSON (100 kB): 413, sin llegar al controlador.
    await request(server())
      .post('/auth/register')
      .send({ full_name: 'A'.repeat(2_000_000) })
      .expect(413);
    // JSON roto: 400.
    await request(server())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.c", "password": ')
      .expect(400);
  });

  describe('subidas de imágenes', () => {
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    );
    const upload = (buffer: Buffer, filename: string, contentType: string) =>
      request(server())
        .post(`/admin/products/${productId}/images`)
        .set('Authorization', bearer(admin))
        .attach('file', buffer, { filename, contentType });
    const uploaded = () =>
      readdirSync(join(process.env.UPLOADS_DIR!, 'products'));

    it('el nombre que manda el cliente no se usa: ni rutas (../) ni extensiones', async () => {
      const res = await upload(
        PNG,
        '../../../evil.php.png',
        'image/png',
      ).expect(201);
      const images = (res.body as { images: { url: string }[] }).images;
      const url = images[images.length - 1].url;
      expect(url).toMatch(/^\/uploads\/products\/[a-f0-9]{32}\.png$/);
      expect(uploaded().some((name) => name.includes('evil'))).toBe(false);
    });

    it('rechaza SVG (puede llevar scripts), aunque diga image/svg+xml o image/png', async () => {
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script></svg>',
      );
      await upload(svg, 'logo.svg', 'image/svg+xml').expect(400);
      await upload(svg, 'logo.png', 'image/png').expect(400);
    });

    it('rechaza un ejecutable con extensión de imagen', async () => {
      const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]);
      await upload(exe, 'foto.jpg', 'image/jpeg').expect(400);
    });
  });

  it('XSS almacenado: el HTML se guarda como texto y la API lo devuelve como JSON, nunca como HTML', async () => {
    const payload = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    const res = await request(server())
      .patch('/users/me')
      .set('Authorization', bearer(customer))
      .send({ full_name: payload })
      .expect(200);
    expect((res.body as { full_name: string }).full_name).toBe(payload);
    // El navegador no puede interpretarlo como página: tipo JSON y sin adivinar el tipo.
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // Cómo se muestra (como texto) lo prueban antua-web/src/test/stored-xss.test.tsx y los
    // correos, order-mails.e2e-spec.ts.
  });
});

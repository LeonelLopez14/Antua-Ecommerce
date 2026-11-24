import request from 'supertest';
import { DataSource } from 'typeorm';
import { AdminAuditLog } from 'src/admin/entities/admin-audit-log.entity';
import { Product } from 'src/products/entities/product.entity';
import { storeDate } from 'src/common/store-time';
import {
  createProduct,
  createTestApp,
  newGuestToken,
  registerAdmin,
  registerUser,
  resetDatabase,
  SHIPPING_DATA,
  TestApp,
} from './helpers';

/** Supertest junta el cuerpo como texto (Buffer → string, con el BOM incluido). */
const asText = (res: request.Response): string =>
  Buffer.isBuffer(res.body) ? res.body.toString('utf8') : res.text;

describe('panel: exportaciones CSV', () => {
  let app: TestApp;
  let db: DataSource;
  let admin: string;
  let variantId: number;
  const today = storeDate(new Date());

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(async () => {
    await resetDatabase(db);
    admin = (await registerAdmin(app, db)).token;
    ({
      variant: { id: variantId },
    } = await createProduct(db, 'exportable', 1500, 3));
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const get = (path: string, token = admin) =>
    request(server())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });

  async function guestOrder(name = 'Ana Prueba') {
    const guest = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', guest)
      .send({ variantId, quantity: 2 })
      .expect(201);
    await request(server())
      .post('/orders')
      .set('X-Guest-Token', guest)
      .send({
        ...SHIPPING_DATA,
        shipping_full_name: name,
        guest_email: 'privado@antua.test',
      })
      .expect(201);
  }

  it('un cliente no puede exportar (403), ni sin sesión (401)', async () => {
    const { token } = await registerUser(app, 'cliente@antua.test');
    await get(
      `/admin/exports/orders.csv?from=${today}&to=${today}`,
      token,
    ).expect(403);
    await get('/admin/exports/products.csv', token).expect(403);
    await request(server()).get('/admin/exports/products.csv').expect(401);
  });

  it('pedidos: BOM, separador ;, montos sin formato y datos personales mínimos', async () => {
    await guestOrder();
    const res = await get(
      `/admin/exports/orders.csv?from=${today}&to=${today}`,
    ).expect(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="pedidos_${today}_${today}.csv"`,
    );
    expect(res.headers['x-export-rows']).toBe('1');

    const csv = asText(res);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header, line] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      'pedido;fecha_montevideo;estado;estado_pago;invitado;cliente;ciudad;codigo_postal;unidades;cupon;subtotal;descuento;envio;total;moneda',
    );
    const cells = line.split(';');
    expect(cells[1]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d-03:00$/);
    expect(cells[4]).toBe('sí');
    expect(cells[5]).toBe('Ana Prueba');
    expect(cells[8]).toBe('2');
    expect(cells.slice(10)).toEqual([
      '3000.00',
      '0.00',
      '1500.00',
      '4500.00',
      'UYU',
    ]);
    // Ni el email, ni el teléfono, ni la calle, ni tokens o hashes.
    expect(csv).not.toContain('privado@antua.test');
    expect(csv).not.toContain(SHIPPING_DATA.shipping_phone);
    expect(csv).not.toContain(SHIPPING_DATA.shipping_street);
    expect(csv).not.toMatch(/[a-f0-9]{64}/);
  });

  it('con separator=comma usa comas', async () => {
    await guestOrder();
    const csv = asText(
      await get(
        `/admin/exports/orders.csv?from=${today}&to=${today}&separator=comma`,
      ).expect(200),
    );
    expect(csv.slice(1).split('\r\n')[0]).toContain('pedido,fecha_montevideo,');
  });

  it('neutraliza fórmulas en los textos (nombre de producto y de cliente)', async () => {
    await db
      .getRepository(Product)
      .update(
        { slug: 'exportable' },
        { name: '=HYPERLINK("http://x","clic")' },
      );
    await guestOrder('+SUM(1;2)');

    const products = asText(
      await get('/admin/exports/products.csv').expect(200),
    );
    expect(products).toContain(`'=HYPERLINK(""http://x"",""clic"")`);
    expect(products).not.toMatch(/;=HYPERLINK/);

    const orders = asText(
      await get(`/admin/exports/orders.csv?from=${today}&to=${today}`).expect(
        200,
      ),
    );
    expect(orders).toContain(`"'+SUM(1;2)"`);
  });

  it('productos: una fila por variante, con stock y aviso de stock bajo', async () => {
    const csv = asText(await get('/admin/exports/products.csv').expect(200));
    const [header, line] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      'producto_id;slug;producto;producto_activo;variante_id;sku;variante;precio;moneda;stock;variante_activa;stock_bajo',
    );
    const cells = line.split(';');
    expect(cells[1]).toBe('exportable');
    expect(cells[7]).toBe('1500.00');
    expect(cells[8]).toBe('UYU');
    expect(cells[9]).toBe('3');
    expect(cells[11]).toBe('sí');
  });

  it('el rango de fechas es obligatorio y válido', async () => {
    await get('/admin/exports/orders.csv').expect(400);
    await get(`/admin/exports/orders.csv?from=${today}`).expect(400);
    await get('/admin/exports/orders.csv?from=2026-11-30&to=2026-11-01').expect(
      400,
    );
    await get('/admin/exports/orders.csv?from=2024-01-01&to=2026-01-01').expect(
      400,
    );
  });

  it('cada exportación queda en la auditoría: quién, qué y cuántas filas', async () => {
    await guestOrder();
    await get(`/admin/exports/orders.csv?from=${today}&to=${today}`).expect(
      200,
    );
    await get('/admin/exports/products.csv?separator=comma').expect(200);

    const log = await db.getRepository(AdminAuditLog).find({
      where: [{ action: 'export.orders' }, { action: 'export.products' }],
      relations: { admin: true },
      order: { id: 'ASC' },
    });
    expect(log.map((entry) => entry.action)).toEqual([
      'export.orders',
      'export.products',
    ]);
    expect(log[0].changes).toMatchObject({ from: today, to: today, rows: 1 });
    expect(log[1].changes).toMatchObject({ separator: ',', rows: 1 });
    expect(log[0].admin?.email).toBe('admin@antua.test');
  });
});

import request from 'supertest';
import { DataSource } from 'typeorm';
import { OrdersIndexes1794900000000 } from 'src/database/proposed/1794900000000-OrdersIndexes';
import { ProductsUpdatedAt1795000000000 } from 'src/database/proposed/1795000000000-ProductsUpdatedAt';
import { Product } from 'src/products/entities/product.entity';
import {
  createProduct,
  createTestApp,
  resetDatabase,
  TestApp,
} from './helpers';

/**
 * Las migraciones propuestas (src/database/proposed) NO se aplican en ninguna base real. Acá se
 * prueban up y down solo contra antua_test (createTestApp se niega a usar otra base), y al final la
 * base queda como la dejan las migraciones aplicadas.
 */
describe('migraciones propuestas (solo en antua_test)', () => {
  let app: TestApp;
  let db: DataSource;

  const columnExists = async () =>
    (
      await db.query<unknown[]>(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'updated_at'",
      )
    ).length > 0;
  const orderIndexes = async () =>
    (
      await db.query<{ name: string }[]>(
        "SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME LIKE 'IDX_orders_%' ORDER BY name",
      )
    ).map((row) => row.name);
  const run = async (
    step: (
      runner: ReturnType<DataSource['createQueryRunner']>,
    ) => Promise<void>,
  ) => {
    const runner = db.createQueryRunner();
    try {
      await step(runner);
    } finally {
      await runner.release();
    }
  };
  const sitemapLastmod = async (slug: string) => {
    const res = await request(app.getHttpServer())
      .get('/sitemap.xml')
      .expect(200);
    const match = new RegExp(
      `/producto/${slug}</loc>(?:<lastmod>([^<]+)</lastmod>)?`,
    ).exec(res.text);
    expect(match).not.toBeNull();
    return match?.[1] ?? null;
  };

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(async () => {
    // Si un test falló a mitad de camino, se intenta dejar el esquema como estaba. Si eso también
    // falla, se cierra la app igual (si no, Jest queda colgado) y el error se ve en la salida.
    try {
      if (await columnExists())
        await run((r) => new ProductsUpdatedAt1795000000000().down(r));
      if ((await orderIndexes()).length)
        await run((r) => new OrdersIndexes1794900000000().down(r));
    } finally {
      await app.close();
    }
  });

  it('ProductsUpdatedAt: up toma la fecha de la auditoría, el sitemap la usa y down la quita', async () => {
    const { product: edited } = await createProduct(db, 'editada');
    await createProduct(db, 'nunca-editada');
    await db.query(
      "INSERT INTO admin_audit_log (action, entity, entity_id, changes, created_at) VALUES ('update', 'product', ?, NULL, '2026-01-02 03:04:05')",
      [edited.id],
    );

    // Sin la columna: el sitemap usa la auditoría y omite lastmod si no hay.
    expect(await columnExists()).toBe(false);
    expect(await sitemapLastmod('editada')).toBe('2026-01-02T03:04:05.000Z');
    expect(await sitemapLastmod('nunca-editada')).toBeNull();

    const before = Date.now() - 5000;
    await run((r) => new ProductsUpdatedAt1795000000000().up(r));
    expect(await columnExists()).toBe(true);

    const rows = await db.query<{ slug: string; updated_at: Date }[]>(
      'SELECT slug, updated_at FROM products ORDER BY slug',
    );
    const updatedAt = Object.fromEntries(
      rows.map((row) => [row.slug, new Date(row.updated_at).getTime()]),
    );
    expect(new Date(updatedAt['editada']).toISOString()).toBe(
      '2026-01-02T03:04:05.000Z',
    );
    expect(updatedAt['nunca-editada']).toBeGreaterThan(before);

    // Con la columna, sin reiniciar la API.
    expect(await sitemapLastmod('editada')).toBe('2026-01-02T03:04:05.000Z');
    expect(await sitemapLastmod('nunca-editada')).toMatch(/^\d{4}-\d\d-\d\dT/);

    // ON UPDATE la mueve sola en cualquier cambio de la fila, aunque la entidad todavía no la tenga.
    await db
      .getRepository(Product)
      .update({ id: edited.id }, { description: 'Otra' });
    const after = new Date((await sitemapLastmod('editada')) ?? 0).getTime();
    expect(after).toBeGreaterThan(before);

    await run((r) => new ProductsUpdatedAt1795000000000().down(r));
    expect(await columnExists()).toBe(false);
    expect(await sitemapLastmod('editada')).toBe('2026-01-02T03:04:05.000Z');
  });

  it('OrdersIndexes: up crea los tres índices y down deja todos los índices como estaban', async () => {
    const allIndexes = async () =>
      (
        await db.query<{ name: string; cols: string }[]>(
          "SELECT INDEX_NAME AS name, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' GROUP BY INDEX_NAME ORDER BY INDEX_NAME",
        )
      ).map((row) => `${row.name}(${row.cols})`);
    const original = await allIndexes();
    expect(await orderIndexes()).toEqual([]);

    await run((r) => new OrdersIndexes1794900000000().up(r));
    expect(await orderIndexes()).toEqual([
      'IDX_orders_created',
      'IDX_orders_status_payment',
      'IDX_orders_user_created',
    ]);

    // Incluye el índice de la FK de userId, que MySQL borra al crear el compuesto.
    await run((r) => new OrdersIndexes1794900000000().down(r));
    expect(await allIndexes()).toEqual(original);
  });
});

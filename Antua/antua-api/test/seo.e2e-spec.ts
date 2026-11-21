import request from 'supertest';
import { DataSource } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import {
  createProduct,
  createTestApp,
  registerAdmin,
  resetDatabase,
  TestApp,
} from './helpers';

describe('sitemap.xml y robots.txt', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  it('lista los productos activos (con lastmod si se editaron) y no los inactivos', async () => {
    const { product } = await createProduct(db, 'activa');
    await createProduct(db, 'apagada');
    await db
      .getRepository(Product)
      .update({ slug: 'apagada' }, { is_active: false });
    // Un cambio desde el panel deja el lastmod en la auditoría.
    const { token } = await registerAdmin(app, db);
    await request(app.getHttpServer())
      .patch(`/admin/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Nueva descripción' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/sitemap.xml')
      .expect(200);
    expect(res.headers['content-type']).toBe('application/xml; charset=utf-8');
    expect(res.text).toMatch(
      /<loc>[^<]+\/producto\/activa<\/loc><lastmod>\d{4}-\d\d-\d\dT[\d:.]+Z<\/lastmod>/,
    );
    expect(res.text).not.toContain('/producto/apagada');
    expect(res.text).toContain('/preguntas-frecuentes</loc>');
  });

  it('robots.txt bloquea lo privado y apunta al sitemap', async () => {
    const res = await request(app.getHttpServer())
      .get('/robots.txt')
      .expect(200);
    expect(res.text).toContain('Disallow: /admin');
    expect(res.text).toContain('Disallow: /cuenta');
    expect(res.text).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });
});

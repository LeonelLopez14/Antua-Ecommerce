import request from 'supertest';
import { DataSource } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { ProductTag } from 'src/products/entities/product-tag.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import {
  createProduct,
  createTestApp,
  resetDatabase,
  TestApp,
} from './helpers';

interface Page {
  items: { slug: string }[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    tagCounts: Record<string, number>;
    priceMin: number;
    priceMax: number;
  };
}

describe('GET /products', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDatabase(db);
    const veganas = await db
      .getRepository(Tag)
      .save({ name: 'Veganas', slug: 'veganas' });
    const packs = await db
      .getRepository(Tag)
      .save({ name: 'Packs', slug: 'packs' });
    const tag = async (product: Product, ...tags: Tag[]) => {
      for (const t of tags)
        await db.getRepository(ProductTag).save({ product, tag: t });
    };
    const a = await createProduct(db, 'c-barata', 1000);
    const b = await createProduct(db, 'a-media', 2000);
    const c = await createProduct(db, 'b-cara', 3000);
    await tag(a.product, veganas);
    await tag(b.product, veganas, packs);
    await tag(c.product, packs);
    const hidden = await createProduct(db, 'inactiva', 500);
    await db
      .getRepository(Product)
      .update(hidden.product.id, { is_active: false });
  });

  const get = async (query: string) => {
    const res = await request(app.getHttpServer())
      .get(`/products${query}`)
      .expect(200);
    return res.body as Page;
  };
  const slugs = (page: Page) => page.items.map((p) => p.slug);

  it('sin parámetros sigue devolviendo el array de activos', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
  });

  it('pagina, informa el total y usa la última página si se pide una que no existe', async () => {
    const first = await get('?limit=2&page=1');
    expect(slugs(first)).toEqual(['c-barata', 'a-media']);
    expect(first).toMatchObject({ total: 3, totalPages: 2, page: 1 });

    const last = await get('?limit=2&page=99');
    expect(slugs(last)).toEqual(['b-cara']);
    expect(last.page).toBe(2);
  });

  it('filtra por varias categorías (alcanza con una)', async () => {
    expect((await get('?tags=veganas')).total).toBe(2);
    expect((await get('?tags=veganas&tags=packs')).total).toBe(3);
    expect((await get('?tags=veganas,packs')).total).toBe(3);
  });

  it('filtra por rango de precio y ordena', async () => {
    expect(slugs(await get('?minPrice=1500&maxPrice=2500'))).toEqual([
      'a-media',
    ]);
    expect(slugs(await get('?sort=price_desc'))).toEqual([
      'b-cara',
      'a-media',
      'c-barata',
    ]);
    expect(slugs(await get('?sort=name'))).toEqual([
      'a-media',
      'b-cara',
      'c-barata',
    ]);
  });

  it('devuelve las facetas de todo el catálogo activo, aunque haya filtros', async () => {
    const { facets } = await get('?tags=veganas&limit=1');
    expect(facets).toEqual({
      tagCounts: { veganas: 2, packs: 2 },
      priceMin: 1000,
      priceMax: 3000,
    });
  });

  it.each(['?sort=id;drop', '?limit=1000', '?page=0', '?minPrice=-1'])(
    'rechaza parámetros inválidos: %s',
    async (query) => {
      await request(app.getHttpServer()).get(`/products${query}`).expect(400);
    },
  );
});

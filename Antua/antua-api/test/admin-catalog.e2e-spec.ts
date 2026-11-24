import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Tag } from 'src/tags/entities/tag.entity';
import {
  createProduct,
  createTestApp,
  newGuestToken,
  registerAdmin,
  resetDatabase,
  TestApp,
} from './helpers';

// PNG de 1×1 píxel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

interface AdminProduct {
  id: number;
  slug: string;
  is_active: boolean;
  variants: {
    id: number;
    name: string;
    stock: number;
    price: string | number;
  }[];
  images: {
    id: number;
    url: string;
    is_primary: boolean;
    sort_order: number;
  }[];
}

describe('panel: catálogo', () => {
  let app: TestApp;
  let db: DataSource;
  let token: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(async () => {
    await resetDatabase(db);
    token = (await registerAdmin(app, db)).token;
  });
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);
  const newProduct = {
    name: 'Galleta de Maní Crocante',
    description: 'Con maní tostado.',
    ingredients: 'Harina, maní',
    allergens: 'Gluten, maní',
  };

  async function createWithVariant(): Promise<AdminProduct> {
    const created = await auth(request(server()).post('/admin/products'))
      .send(newProduct)
      .expect(201);
    const { id } = created.body as AdminProduct;
    const res = await auth(
      request(server()).post(`/admin/products/${id}/variants`),
    )
      .send({ name: 'x1', price: 950.5, stock: 10, sku: 'MANI-X1' })
      .expect(201);
    return res.body as AdminProduct;
  }

  it('crea un producto con slug generado, inactivo hasta tener variantes', async () => {
    const res = await auth(request(server()).post('/admin/products'))
      .send(newProduct)
      .expect(201);
    const product = res.body as AdminProduct;
    expect(product.slug).toBe('galleta-de-mani-crocante');
    expect(product.is_active).toBe(false);

    // Sin variantes no se puede activar.
    await auth(request(server()).patch(`/admin/products/${product.id}`))
      .send({ is_active: true })
      .expect(409);

    // Mismo nombre: el slug generado no choca.
    const again = await auth(request(server()).post('/admin/products'))
      .send(newProduct)
      .expect(201);
    expect((again.body as AdminProduct).slug).toBe(
      'galleta-de-mani-crocante-2',
    );

    // Slug elegido a mano y repetido: 409.
    await auth(request(server()).post('/admin/products'))
      .send({ ...newProduct, slug: 'galleta-de-mani-crocante' })
      .expect(409);
  });

  it('valida las variantes: precio positivo con 2 decimales, nombre x1/x6/x12 y SKU único', async () => {
    const { id } = await createWithVariant();
    const post = (body: object) =>
      auth(request(server()).post(`/admin/products/${id}/variants`)).send(body);

    await post({ name: 'x6', price: -1, stock: 1, sku: 'A1' }).expect(400);
    await post({ name: 'x6', price: 10.555, stock: 1, sku: 'A1' }).expect(400);
    await post({ name: 'x24', price: 10, stock: 1, sku: 'A1' }).expect(400);
    await post({ name: 'x6', price: 10, stock: -3, sku: 'A1' }).expect(400);
    await post({ name: 'x6', price: 10, stock: 1, sku: 'MANI-X1' }).expect(409);
    await post({ name: 'x1', price: 10, stock: 1, sku: 'OTRO' }).expect(409);
    // Un campo que el DTO no declara (el id) se rechaza (forbidNonWhitelisted).
    await post({
      name: 'x6',
      price: 5400,
      stock: 4,
      sku: 'MANI-X6',
      id: 999,
    }).expect(400);
    await post({ name: 'x6', price: 5400, stock: 4, sku: 'MANI-X6' }).expect(
      201,
    );

    const variant = (await auth(request(server()).get(`/admin/products/${id}`)))
      .body as AdminProduct;
    const x6 = variant.variants.find((v) => v.name === 'x6')!;
    await auth(
      request(server()).patch(`/admin/products/${id}/variants/${x6.id}`),
    )
      // El stock no se toca por PATCH (solo con un movimiento de stock, que queda en la auditoría).
      .send({ stock: 999 })
      .expect(400);
    const after = (await auth(request(server()).get(`/admin/products/${id}`)))
      .body as AdminProduct;
    expect(after.variants.find((v) => v.name === 'x6')!.stock).toBe(4);
  });

  it('el producto activo aparece en la tienda pública', async () => {
    const product = await createWithVariant();
    await auth(request(server()).patch(`/admin/products/${product.id}`))
      .send({ is_active: true, nutrition_info: 'Por galleta: 120 kcal' })
      .expect(200);
    const res = await request(server())
      .get(`/products/${product.slug}`)
      .expect(200);
    expect(res.body).toMatchObject({
      nutrition_info: 'Por galleta: 120 kcal',
      base_price: '950.50',
    });
  });

  it('mueve stock con motivo y lo registra en la auditoría', async () => {
    const product = await createWithVariant();
    const variantId = product.variants[0].id;
    const move = (body: object) =>
      auth(
        request(server()).post(
          `/admin/products/${product.id}/variants/${variantId}/stock`,
        ),
      ).send(body);

    await move({ reason: 'restock', quantity: 5 }).expect(200);
    await move({ reason: 'shrinkage', quantity: 20 }).expect(409);
    await move({
      reason: 'shrinkage',
      quantity: 3,
      note: 'Se rompieron',
    }).expect(200);
    const res = await move({ reason: 'adjustment', quantity: 7 }).expect(200);
    expect((res.body as AdminProduct).variants[0].stock).toBe(7);
    await move({ reason: 'robo', quantity: 1 }).expect(400);

    const audit = await auth(
      request(server()).get(
        `/admin/audit?entity=variant&entityId=${variantId}`,
      ),
    ).expect(200);
    const entries = (
      audit.body as { items: { action: string; changes: object }[] }
    ).items;
    expect(entries.filter((e) => e.action === 'stock.move')).toHaveLength(3);
    expect(entries[0].changes).toMatchObject({
      reason: 'adjustment',
      before: 12,
      after: 7,
    });
  });

  it('borra lo que no tiene historial; lo que tiene pedidos o carritos se desactiva', async () => {
    const free = await createWithVariant();
    const removed = await auth(
      request(server()).delete(`/admin/products/${free.id}`),
    ).expect(200);
    expect(removed.body).toMatchObject({ deleted: true, deactivated: false });
    await auth(request(server()).get(`/admin/products/${free.id}`)).expect(404);

    const { product, variant } = await createProduct(db, 'con-carrito');
    const guest = await newGuestToken(app);
    await request(server())
      .post('/cart/items')
      .set('X-Guest-Token', guest)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);

    const variantRes = await auth(
      request(server()).delete(
        `/admin/products/${product.id}/variants/${variant.id}`,
      ),
    ).expect(200);
    expect(variantRes.body).toMatchObject({
      deleted: false,
      deactivated: true,
    });
    expect((variantRes.body as { message: string }).message).toContain(
      'historial',
    );

    const productRes = await auth(
      request(server()).delete(`/admin/products/${product.id}`),
    ).expect(200);
    expect(productRes.body).toMatchObject({
      deleted: false,
      deactivated: true,
    });
    await request(server()).get('/products/con-carrito').expect(404);
  });

  describe('imágenes', () => {
    const upload = (
      id: number,
      buffer: Buffer,
      filename: string,
      type = 'image/png',
    ) =>
      auth(request(server()).post(`/admin/products/${id}/images`)).attach(
        'file',
        buffer,
        {
          filename,
          contentType: type,
        },
      );

    it('acepta PNG real, lo sirve con cabeceras seguras y borra el archivo al quitarla', async () => {
      const { id } = await createWithVariant();
      const first = (await upload(id, PNG, 'foto.png').expect(201))
        .body as AdminProduct;
      const second = (await upload(id, PNG, 'otra.png').expect(201))
        .body as AdminProduct;
      expect(first.images[0]).toMatchObject({ is_primary: true });
      expect(second.images).toHaveLength(2);
      expect(second.images[1].is_primary).toBe(false);

      const url = second.images[0].url;
      expect(url).toMatch(/^\/uploads\/products\/[a-f0-9]{32}\.png$/);
      const served = await request(server()).get(url).expect(200);
      expect(served.headers['content-type']).toBe('image/png');
      expect(served.headers['x-content-type-options']).toBe('nosniff');
      expect(served.headers['content-security-policy']).toContain(
        "default-src 'none'",
      );

      // Principal y orden.
      const [a, b] = second.images;
      await auth(
        request(server()).patch(`/admin/products/${id}/images/${b.id}/primary`),
      ).expect(200);
      const reordered = await auth(
        request(server()).patch(`/admin/products/${id}/images/order`),
      )
        .send({ imageIds: [b.id, a.id] })
        .expect(200);
      expect((reordered.body as AdminProduct).images.map((i) => i.id)).toEqual([
        b.id,
        a.id,
      ]);
      await auth(request(server()).patch(`/admin/products/${id}/images/order`))
        .send({ imageIds: [b.id] })
        .expect(400);

      const file = join(
        process.env.UPLOADS_DIR!,
        'products',
        a.url.split('/').pop()!,
      );
      expect(existsSync(file)).toBe(true);
      await auth(
        request(server()).delete(`/admin/products/${id}/images/${a.id}`),
      ).expect(200);
      expect(existsSync(file)).toBe(false);
      await request(server()).get(a.url).expect(404);
    });

    it('rechaza lo que no es imagen aunque diga image/png, y lo que pasa de 2 MB', async () => {
      const { id } = await createWithVariant();
      await upload(
        id,
        Buffer.from('<html><script>alert(1)</script></html>'),
        'x.png',
      ).expect(400);
      await upload(
        id,
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        'x.svg',
        'image/svg+xml',
      ).expect(400);
      const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
      await upload(id, big, 'grande.png').expect(413);
      await auth(request(server()).post(`/admin/products/${id}/images`)).expect(
        400,
      );
    });

    it('no sirve archivos fuera de la carpeta de subidas', async () => {
      await request(server()).get('/uploads/../package.json').expect(404);
      await request(server())
        .get('/uploads/%2e%2e/package.json')
        .expect((res) => {
          expect([403, 404]).toContain(res.status);
        });
    });
  });

  describe('tags', () => {
    it('los de la Home no cambian de slug; se pueden renombrar y desactivar', async () => {
      const home = await db
        .getRepository(Tag)
        .save({ name: 'Clásicas', slug: 'clasicas' });
      await auth(request(server()).patch(`/admin/tags/${home.id}`))
        .send({ slug: 'clasicas-2' })
        .expect(409);
      await auth(request(server()).patch(`/admin/tags/${home.id}`))
        .send({ name: 'Las clásicas', is_active: false })
        .expect(200);

      const list = await auth(request(server()).get('/admin/tags')).expect(200);
      expect(list.body).toEqual([
        expect.objectContaining({
          slug: 'clasicas',
          name: 'Las clásicas',
          protected: true,
          is_active: false,
        }),
      ]);
      const publicTags = await request(server()).get('/tags').expect(200);
      expect(publicTags.body).toEqual([]);
    });

    it('crea tags con slug generado y no admite duplicados', async () => {
      const res = await auth(request(server()).post('/admin/tags'))
        .send({ name: 'De Temporada' })
        .expect(201);
      expect(res.body).toMatchObject({ slug: 'de-temporada', is_active: true });
      await auth(request(server()).post('/admin/tags'))
        .send({ name: 'De temporada' })
        .expect(409);
      await auth(
        request(server()).delete(
          `/admin/tags/${(res.body as { id: number }).id}`,
        ),
      ).expect(404);
    });
  });
});

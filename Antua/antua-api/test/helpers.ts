import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { Coupon } from 'src/coupons/entities/coupon.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';

export type TestApp = INestApplication<App>;

export async function createTestApp(): Promise<{
  app: TestApp;
  db: DataSource;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: TestApp = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, db: app.get(DataSource) };
}

/** Vacía la base de tests. El candado evita vaciar otra base por un .env mal configurado. */
export async function resetDatabase(db: DataSource): Promise<void> {
  if (db.options.database !== 'antua_test') {
    throw new Error(
      `Los e2e solo pueden vaciar antua_test (conectado a ${String(db.options.database)}).`,
    );
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { tableName } of db.entityMetadatas)
    await db.query(`TRUNCATE TABLE \`${tableName}\``);
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

export async function createProduct(
  db: DataSource,
  slug: string,
  price = 1000,
  stock = 10,
) {
  const product = await db.getRepository(Product).save({
    name: `Producto ${slug}`,
    slug,
    ingredients: 'Harina',
    allergens: 'Gluten',
    description: 'Descripción de prueba',
    base_price: price,
    is_active: true,
  });
  const variant = await db.getRepository(ProductVariant).save({
    name: 'x1',
    price,
    stock,
    is_active: true,
    sku: `sku-${slug}`,
    product,
  });
  return { product, variant };
}

export function createCoupon(
  db: DataSource,
  code: string,
  overrides: Partial<Coupon> = {},
) {
  const now = Date.now();
  return db.getRepository(Coupon).save({
    code,
    discount_type: 'fixed',
    discount_value: 100,
    min_order_amount: 0,
    usage_limit: null,
    valid_from: new Date(now - 86_400_000),
    valid_until: new Date(now + 86_400_000),
    is_active: true,
    ...overrides,
  });
}

/** Crea un carrito de invitado y devuelve su token. */
export async function newGuestToken(app: TestApp): Promise<string> {
  const res = await request(app.getHttpServer()).get('/cart').expect(200);
  return String(res.headers['x-guest-token']);
}

export async function registerUser(
  app: TestApp,
  email: string,
  password = 'ClaveSegura123',
) {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ full_name: 'Usuario de Prueba', email, password })
    .expect(201);
  const body = res.body as {
    token: string;
    user: { id: number; email: string };
  };
  return body;
}

export const SHIPPING_DATA = {
  shipping_full_name: 'Ana Prueba',
  shipping_phone: '1155554444',
  shipping_street: 'Calle 123',
  shipping_city: 'Montevideo',
  shipping_postal_code: '11200',
};

/** Compra el producto con una cuenta y marca el pedido como entregado. */
export async function buyAndDeliver(
  app: TestApp,
  db: DataSource,
  token: string,
  variantId: number,
) {
  await request(app.getHttpServer())
    .post('/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ variantId, quantity: 1 })
    .expect(201);
  const res = await request(app.getHttpServer())
    .post('/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(SHIPPING_DATA)
    .expect(201);
  const { id } = (res.body as { order: { id: number } }).order;
  await db.query("UPDATE orders SET status = 'delivered' WHERE id = ?", [id]);
  return id;
}

/**
 * Borra los datos de prueba del seed. También borra los pedidos que incluyan productos
 * de prueba, porque no pueden existir sin ellos: por eso pide confirmación explícita.
 *
 *   pnpm seed:clean --yes
 *
 * Las tags se conservan: el catálogo real también las usa.
 * También borra los archivos de imagen que se subieron a esos productos desde el panel
 * (por ejemplo, los que crea el e2e del panel).
 */
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import dataSource from '../src/database/data-source';
import { parseUploadsDir } from '../src/config/env.validation';
import { UPLOADED_FILE_NAME } from '../src/admin/catalog/image-file';

const SEED_PRODUCTS = `SELECT id FROM products WHERE slug LIKE 'seed-%'`;
const SEED_VARIANTS = `SELECT id FROM product_variants WHERE productId IN (${SEED_PRODUCTS})`;
const SEED_USERS = `SELECT id FROM users WHERE email LIKE 'seed.%@antua.test'`;
const SEED_COUPONS = `SELECT id FROM coupons WHERE code LIKE 'SEED%'`;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La limpieza del seed no corre en producción.');
  }
  await dataSource.initialize();
  const database = String(dataSource.options.database);

  if (!process.argv.includes('--yes')) {
    throw new Error(
      `Esto borra los datos seed- de "${database}" y los pedidos que los incluyan. Confirmá con: pnpm seed:clean --yes`,
    );
  }

  const files: string[] = [];
  await dataSource.transaction(async (manager) => {
    // MySQL no deja borrar de una tabla que se lee en un subquery directo: se resuelven los ids antes.
    const ids = async (sql: string): Promise<number[]> =>
      (await manager.query<{ id: number }[]>(sql)).map((row) => row.id);
    const run = async (table: string, column: string, values: number[]) => {
      if (values.length === 0) return;
      await manager.query(`DELETE FROM ${table} WHERE ${column} IN (?)`, [
        values,
      ]);
    };

    const products = await ids(SEED_PRODUCTS);
    if (products.length) {
      const rows = await manager.query<{ file_name: string }[]>(
        'SELECT file_name FROM product_images WHERE productId IN (?) AND file_name IS NOT NULL',
        [products],
      );
      files.push(...rows.map((row) => row.file_name));
    }
    const variants = await ids(SEED_VARIANTS);
    const users = await ids(SEED_USERS);
    const coupons = await ids(SEED_COUPONS);
    const orders = variants.length
      ? (
          await manager.query<{ id: number }[]>(
            'SELECT DISTINCT orderId AS id FROM order_items WHERE variantId IN (?)',
            [variants],
          )
        ).map((row) => row.id)
      : [];
    const carts = users.length
      ? (
          await manager.query<{ id: number }[]>(
            'SELECT id FROM carts WHERE userId IN (?)',
            [users],
          )
        ).map((row) => row.id)
      : [];

    await run('payments', 'order_id', orders);
    await run('order_items', 'orderId', orders);
    await run('orders', 'id', orders);
    if (coupons.length) {
      await manager.query(
        'UPDATE orders SET couponId = NULL WHERE couponId IN (?)',
        [coupons],
      );
      await manager.query(
        'UPDATE carts SET couponId = NULL WHERE couponId IN (?)',
        [coupons],
      );
    }
    await run('cart_items', 'variantId', variants);
    await run('cart_items', 'cartId', carts);
    await run('carts', 'id', carts);
    await run('reviews', 'productId', products);
    await run('product_tags', 'product_id', products);
    await run('product_images', 'productId', products);
    await run('product_variants', 'productId', products);
    await run('products', 'id', products);
    await run('coupons', 'id', coupons);
    await run('reviews', 'userId', users);
    await run('addresses', 'userId', users);
    await run('orders', 'userId', users);
    await run('users', 'id', users);

    process.stdout.write(
      `Limpieza lista en ${database}: ${products.length} productos, ${coupons.length} cupones, ${users.length} usuarios, ${orders.length} pedidos.\n`,
    );
  });

  // Los archivos se borran después de confirmar la transacción, y solo los de nombre generado.
  const dir = join(parseUploadsDir(process.env.UPLOADS_DIR), 'products');
  for (const name of files.filter((file) => UPLOADED_FILE_NAME.test(file))) {
    await unlink(join(dir, name)).catch(() => undefined);
  }
  if (files.length)
    process.stdout.write(`Imágenes subidas borradas: ${files.length}.\n`);
}

void main()
  .catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  // Una conexión abierta mantendría vivo el proceso aunque haya fallado.
  .finally(() => (dataSource.isInitialized ? dataSource.destroy() : undefined));

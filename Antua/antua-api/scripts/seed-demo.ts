/**
 * Datos de DEMOSTRACIÓN: un catálogo coherente para mostrar la tienda (capturas, una presentación,
 * un servidor de prueba). Todo es de ejemplo y está marcado como tal.
 *
 *   DEMO_PASSWORD='…' pnpm seed:demo
 *   DEMO_PASSWORD='…' DEMO_ADMIN_PASSWORD='…' pnpm seed:demo    # además, un admin de demostración
 *   pnpm seed:demo:clean --yes                                  # lo borra todo
 *
 * Qué crea (datos en scripts/seed-demo-data.json):
 * - Las seis categorías de DESIGN.md (tags), 12 productos `demo-…` (dos por categoría) con
 *   variantes x1/x6/x12 e ilustraciones propias (antua-web/public/demo/productos, SVG).
 * - Reseñas de personas inventadas, el cupón DEMO10 y la cuenta demo.cliente@antojarte.example.
 *
 * Reglas:
 * - Las contraseñas salen SOLO de variables de entorno (DEMO_PASSWORD, DEMO_ADMIN_PASSWORD), con la
 *   misma política que el registro. Nunca hay una por defecto en el código.
 * - Se niega a correr con NODE_ENV=production y si hay migraciones pendientes.
 * - Es idempotente: actualiza por slug, sku, código o email. Correrlo dos veces no duplica nada.
 * - Solo toca filas con prefijo `demo-` / `DEMO` / `demo.`: no pisa el catálogo real ni el seed.
 */
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IsNull } from 'typeorm';
import type {
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import dataSource from '../src/database/data-source';
import { Coupon } from '../src/coupons/entities/coupon.entity';
import { ProductImage } from '../src/products/entities/product-image.entity';
import { ProductTag } from '../src/products/entities/product-tag.entity';
import { ProductVariant } from '../src/products/entities/product-variant.entity';
import { Product } from '../src/products/entities/product.entity';
import { Review } from '../src/reviews/entities/review.entity';
import { Tag } from '../src/tags/entities/tag.entity';
import { User, UserRole } from '../src/users/entities/user.entity';
import { demoEmail } from '../src/database/seed-accounts';

export interface DemoData {
  tags: { name: string; slug: string }[];
  products: {
    slug: string;
    name: string;
    tags: string[];
    price: number;
    description: string;
    ingredients: string;
    allergens: string;
  }[];
  reviews: {
    product: string;
    author: string;
    rating: number;
    comment: string;
  }[];
  coupon: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
  };
  customer: { full_name: string; email: string };
}

/** Lo que se agrega a cada texto para que nadie lo confunda con un producto o una opinión real. */
export const EXAMPLE_NOTE = ' (Producto de ejemplo.)';

/** x6 y x12 con un pequeño descuento por cantidad, redondeado a 10 pesos. */
export const variantPrices = (unit: number) => ({
  x1: unit,
  x6: Math.round((unit * 6 * 0.92) / 10) * 10,
  x12: Math.round((unit * 12 * 0.85) / 10) * 10,
});

/** La misma política que el registro y `admin:create`. */
export function assertDemoPassword(name: string, value: string | undefined) {
  if (
    !value ||
    value.length < 8 ||
    value.length > 72 ||
    !/[A-Za-z]/.test(value) ||
    !/\d/.test(value)
  ) {
    throw new Error(
      `${name}: definila en el entorno, de 8 a 72 caracteres, con al menos una letra y un número. No hay contraseña por defecto.`,
    );
  }
}

export function assertNotProduction(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'seed:demo no corre con NODE_ENV=production: crea cuentas de demostración. Usalo en una base de desarrollo o de prueba.',
    );
  }
}

export function loadDemoData(): DemoData {
  return JSON.parse(
    readFileSync(join(__dirname, 'seed-demo-data.json'), 'utf8'),
  ) as DemoData;
}

async function saveBy<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: FindOptionsWhere<T>,
  values: DeepPartial<T>,
): Promise<T> {
  const found = await repository.findOneBy(where);
  return repository.save(
    found ? repository.merge(found, values) : repository.create(values),
  );
}

const DAY = 86_400_000;

async function main() {
  assertNotProduction();
  assertDemoPassword('DEMO_PASSWORD', process.env.DEMO_PASSWORD);
  if (process.env.DEMO_ADMIN_PASSWORD !== undefined) {
    assertDemoPassword('DEMO_ADMIN_PASSWORD', process.env.DEMO_ADMIN_PASSWORD);
  }
  const data = loadDemoData();

  await dataSource.initialize();
  if (await dataSource.showMigrations()) {
    throw new Error(
      'Hay migraciones pendientes. Revisalas y corré `pnpm migration:run` antes de seed:demo.',
    );
  }

  await dataSource.transaction(async (manager) => {
    const tags = manager.getRepository(Tag);
    for (const tag of data.tags) await saveBy(tags, { slug: tag.slug }, tag);

    const products = manager.getRepository(Product);
    const variants = manager.getRepository(ProductVariant);
    const images = manager.getRepository(ProductImage);
    const productTags = manager.getRepository(ProductTag);
    for (const item of data.products) {
      const product = await saveBy(
        products,
        { slug: item.slug },
        {
          name: item.name,
          slug: item.slug,
          description: `${item.description}${EXAMPLE_NOTE}`,
          ingredients: item.ingredients,
          allergens: item.allergens,
          base_price: item.price,
          is_active: true,
        },
      );
      const prices = variantPrices(item.price);
      for (const [name, price] of Object.entries(prices)) {
        const sku = `DEMO-${item.slug.replace(/^demo-/, '').toUpperCase()}-${name.toUpperCase()}`;
        await saveBy(
          variants,
          { sku },
          {
            name,
            price,
            sku,
            stock: name === 'x12' ? 8 : 40,
            is_active: true,
            product: { id: product.id },
          },
        );
      }
      // La ilustración se reemplaza; una imagen subida desde el panel (con archivo) se conserva.
      await images.delete({ product: { id: product.id }, file_name: IsNull() });
      const hasPrimary = await images.existsBy({
        product: { id: product.id },
        is_primary: true,
      });
      await images.save({
        url: `/demo/productos/${item.slug}.svg`,
        sort_order: 0,
        is_primary: !hasPrimary,
        product: { id: product.id },
      });
      await productTags.delete({ product: { id: product.id } });
      for (const slug of item.tags) {
        const tag = await tags.findOneByOrFail({ slug });
        await productTags.save({ product: { id: product.id }, tag });
      }
    }

    const now = Date.now();
    await saveBy(
      manager.getRepository(Coupon),
      { code: data.coupon.code },
      {
        ...data.coupon,
        is_active: true,
        valid_from: new Date(now - DAY),
        valid_until: new Date(now + 90 * DAY),
      },
    );

    const users = manager.getRepository(User);
    await saveBy(
      users,
      { email: data.customer.email },
      {
        ...data.customer,
        password_hash: await bcrypt.hash(process.env.DEMO_PASSWORD!, 10),
      },
    );
    if (process.env.DEMO_ADMIN_PASSWORD) {
      const email = demoEmail('admin');
      await saveBy(
        users,
        { email },
        {
          full_name: 'Admin de Demostración',
          email,
          password_hash: await bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD, 10),
          role: UserRole.ADMIN,
        },
      );
    }

    // Las autoras de las reseñas no inician sesión: su clave es aleatoria y nadie la conoce.
    const reviews = manager.getRepository(Review);
    for (const review of data.reviews) {
      const email = demoEmail(review.author);
      const author =
        (await users.findOneBy({ email })) ??
        (await users.save({
          full_name: review.author,
          email,
          password_hash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        }));
      const product = await products.findOneByOrFail({ slug: review.product });
      await saveBy(
        reviews,
        { product: { id: product.id }, user: { id: author.id } },
        {
          rating: review.rating,
          comment: review.comment,
          product: { id: product.id },
          user: { id: author.id },
        },
      );
    }
  });

  process.stdout.write(
    `Demostración lista: ${data.products.length} productos de ejemplo en ${data.tags.length} categorías, ${data.reviews.length} reseñas, el cupón ${data.coupon.code} y la cuenta ${data.customer.email}${process.env.DEMO_ADMIN_PASSWORD ? ` (y ${demoEmail('admin')})` : ''}.\n`,
  );
}

if (require.main === module) {
  void main()
    .catch((error: unknown) => {
      process.stderr.write(`${String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(() =>
      dataSource.isInitialized ? dataSource.destroy() : undefined,
    );
}

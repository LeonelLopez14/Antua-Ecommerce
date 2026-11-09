/**
 * Datos de prueba reproducibles: productos, tags, cupones, usuarios y reseñas.
 * Es idempotente (actualiza por slug, sku, código o email) y solo toca filas con
 * prefijo `seed-` / `SEED` / `seed.`. Nunca corre en producción.
 *
 *   pnpm seed
 *
 * La contraseña de los usuarios de prueba es SEED_PASSWORD o, por defecto, SeedPass123!.
 * No es una credencial real: no la uses fuera de desarrollo.
 */
import * as bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import { User } from '../src/users/entities/user.entity';

interface SeedData {
  tags: { name: string; slug: string }[];
  products: {
    name: string;
    slug: string;
    ingredients: string;
    allergens: string;
    description: string;
    base_price: string;
    is_active: boolean;
    variants: { name: string; price: string; sku: string; stock: number }[];
    images: { url: string; sort_order: number }[];
    tags: string[];
  }[];
  reviews: {
    product: string;
    rating: number;
    comment: string;
    author: string;
  }[];
}

const DAY = 86_400_000;

/** Busca la fila por su clave natural: si existe la actualiza y si no la crea. Así el seed se puede repetir. */
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

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed no corre en producción.');
  }

  const data = JSON.parse(
    readFileSync(join(__dirname, 'seed-data.json'), 'utf8'),
  ) as SeedData;

  await dataSource.initialize();
  await dataSource.runMigrations();

  await dataSource.transaction(async (manager) => {
    const tags = manager.getRepository(Tag);
    for (const tag of data.tags) {
      await saveBy(tags, { slug: tag.slug }, tag);
    }

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
          ingredients: item.ingredients,
          allergens: item.allergens,
          description: item.description,
          base_price: Number(item.base_price),
          is_active: item.is_active,
        },
      );

      for (const variant of item.variants) {
        await saveBy(
          variants,
          { sku: variant.sku },
          {
            name: variant.name,
            price: Number(variant.price),
            sku: variant.sku,
            stock: variant.stock,
            is_active: true,
            product: { id: product.id },
          },
        );
      }

      await images.delete({ product: { id: product.id } });
      for (const image of item.images) {
        await images.save({ ...image, product: { id: product.id } });
      }

      await productTags.delete({ product: { id: product.id } });
      for (const slug of item.tags) {
        const tag = await tags.findOneByOrFail({ slug });
        await productTags.save({ product: { id: product.id }, tag });
      }
    }

    const now = Date.now();
    const coupons = manager.getRepository(Coupon);
    const validity = {
      valid_from: new Date(now - DAY),
      valid_until: new Date(now + 60 * DAY),
      is_active: true,
    };
    await saveBy(
      coupons,
      { code: 'SEED10' },
      {
        code: 'SEED10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 5000,
        ...validity,
      },
    );
    await saveBy(
      coupons,
      { code: 'SEEDFIJO' },
      {
        code: 'SEEDFIJO',
        discount_type: 'fixed',
        discount_value: 1000,
        ...validity,
      },
    );
    await saveBy(
      coupons,
      { code: 'SEEDVENCIDO' },
      {
        code: 'SEEDVENCIDO',
        discount_type: 'percentage',
        discount_value: 20,
        is_active: true,
        valid_from: new Date(now - 60 * DAY),
        valid_until: new Date(now - DAY),
      },
    );

    const users = manager.getRepository(User);
    const password_hash = await bcrypt.hash(
      process.env.SEED_PASSWORD ?? 'SeedPass123!',
      10,
    );
    const emailOf = (author: string) =>
      `seed.${author.split(' ')[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}@antua.test`;
    const authors = [...new Set(data.reviews.map((r) => r.author))];
    for (const full_name of [...authors, 'Cliente de Prueba']) {
      const email =
        full_name === 'Cliente de Prueba'
          ? 'seed.cliente@antua.test'
          : emailOf(full_name);
      await saveBy(users, { email }, { full_name, email, password_hash });
    }

    const reviews = manager.getRepository(Review);
    for (const review of data.reviews) {
      const product = await products.findOneByOrFail({ slug: review.product });
      const user = await users.findOneByOrFail({
        email: emailOf(review.author),
      });
      await saveBy(
        reviews,
        { product: { id: product.id }, user: { id: user.id } },
        {
          rating: review.rating,
          comment: review.comment,
          product: { id: product.id },
          user: { id: user.id },
        },
      );
    }
  });

  process.stdout.write(
    `Seed listo: ${data.products.length} productos, ${data.tags.length} tags, 3 cupones.\n`,
  );
}

void main()
  .catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  // Una conexión abierta mantendría vivo el proceso aunque haya fallado.
  .finally(() => (dataSource.isInitialized ? dataSource.destroy() : undefined));

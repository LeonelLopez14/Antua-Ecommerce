/**
 * Datos de prueba reproducibles: productos, tags, cupones, usuarios y reseñas.
 * Es idempotente (actualiza por slug, sku, código o email) y solo toca filas con
 * prefijo `seed-` / `SEED` / `seed.`. El seed completo nunca corre en producción.
 *
 *   pnpm seed
 *   pnpm seed --catalog-only   # solo tags y productos: sin usuarios, cupones ni reseñas (vale en producción)
 *
 * La contraseña de los usuarios de prueba es SEED_PASSWORD o, por defecto, SeedPass123!.
 * No es una credencial real: no la uses fuera de desarrollo.
 *
 * Admin de prueba (solo desarrollo): seed.admin@antojarte.example, SOLO si se define SEED_ADMIN_PASSWORD.
 * No tiene contraseña por defecto, a propósito: un admin con clave conocida sería una puerta abierta.
 *   SEED_ADMIN_PASSWORD='…' pnpm seed
 */
import * as bcrypt from 'bcrypt';
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
import {
  SEED_ADMIN_EMAIL,
  SEED_CUSTOMER_EMAIL,
  seedEmail,
} from '../src/database/seed-accounts';

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
  // --catalog-only: solo tags y productos de ejemplo (con variantes e imágenes). Sin usuarios,
  // cupones ni reseñas, así que no crea ninguna cuenta con contraseña conocida. Es el único modo
  // que corre en producción (por ejemplo, para mostrar la tienda en un servidor de prueba).
  const catalogOnly = process.argv.includes('--catalog-only');
  if (process.env.NODE_ENV === 'production' && !catalogOnly) {
    throw new Error(
      'El seed completo no corre en producción: crea usuarios con contraseña conocida. Usá --catalog-only para cargar solo el catálogo de ejemplo.',
    );
  }

  const data = JSON.parse(
    readFileSync(join(__dirname, 'seed-data.json'), 'utf8'),
  ) as SeedData;

  await dataSource.initialize();
  // El seed no aplica migraciones: si falta alguna, se corre antes `pnpm migration:run` (después de leerla).
  if (await dataSource.showMigrations()) {
    throw new Error(
      'Hay migraciones pendientes. Revisalas y corré `pnpm migration:run` antes del seed.',
    );
  }

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

      // Solo se reemplazan las imágenes del seed: las subidas desde el panel (con archivo) se conservan.
      await images.delete({ product: { id: product.id }, file_name: IsNull() });
      const hasPrimary = await images.existsBy({
        product: { id: product.id },
        is_primary: true,
      });
      const first = Math.min(...item.images.map((image) => image.sort_order));
      for (const image of item.images) {
        await images.save({
          ...image,
          is_primary: !hasPrimary && image.sort_order === first,
          product: { id: product.id },
        });
      }

      await productTags.delete({ product: { id: product.id } });
      for (const slug of item.tags) {
        const tag = await tags.findOneByOrFail({ slug });
        await productTags.save({ product: { id: product.id }, tag });
      }
    }

    if (catalogOnly) return;

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
    const authors = [...new Set(data.reviews.map((r) => r.author))];
    for (const full_name of [...authors, 'Cliente de Prueba']) {
      const email =
        full_name === 'Cliente de Prueba'
          ? SEED_CUSTOMER_EMAIL
          : seedEmail(full_name);
      await saveBy(users, { email }, { full_name, email, password_hash });
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (adminPassword) {
      // La misma política que el registro y admin:create.
      if (
        adminPassword.length < 8 ||
        adminPassword.length > 72 ||
        !/[A-Za-z]/.test(adminPassword) ||
        !/\d/.test(adminPassword)
      ) {
        throw new Error(
          'SEED_ADMIN_PASSWORD: de 8 a 72 caracteres, con al menos una letra y un número.',
        );
      }
      await saveBy(
        users,
        { email: SEED_ADMIN_EMAIL },
        {
          full_name: 'Admin de Prueba',
          email: SEED_ADMIN_EMAIL,
          password_hash: await bcrypt.hash(adminPassword, 10),
          role: UserRole.ADMIN,
        },
      );
    }

    const reviews = manager.getRepository(Review);
    for (const review of data.reviews) {
      const product = await products.findOneByOrFail({ slug: review.product });
      const user = await users.findOneByOrFail({
        email: seedEmail(review.author),
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
    catalogOnly
      ? `Catálogo de ejemplo listo: ${data.products.length} productos y ${data.tags.length} tags (sin usuarios, cupones ni reseñas).\n`
      : `Seed listo: ${data.products.length} productos, ${data.tags.length} tags, 3 cupones${
          process.env.SEED_ADMIN_PASSWORD
            ? ` y el admin ${SEED_ADMIN_EMAIL}`
            : ''
        }.\n`,
  );
}

void main()
  .catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  // Una conexión abierta mantendría vivo el proceso aunque haya fallado.
  .finally(() => (dataSource.isInitialized ? dataSource.destroy() : undefined));

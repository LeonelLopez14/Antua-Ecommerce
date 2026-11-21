/**
 * Carga información nutricional, ingredientes y alérgenos de EJEMPLO (docs/contenido-sitio.md §6)
 * en los productos existentes, completando SOLO lo que está vacío. Es reversible.
 *
 *   pnpm nutrition:examples --dry-run   # muestra qué haría, sin escribir
 *   pnpm nutrition:examples --yes       # aplica (hacé antes un respaldo de la base)
 *   pnpm nutrition:examples --undo --yes  # deshace: vacía solo lo que sigue igual a lo que cargó el script
 *
 * Cada producto toma los valores de su categoría según sus tags, con esta prioridad:
 * sin-azucar > sin-gluten > veganas > clasicas (y de-temporada usa los de clasicas).
 * Los que solo son "packs" (surtidos) o no tienen categoría quedan sin tocar.
 * Cada cambio queda en admin_audit_log (sin admin: lo hizo un script).
 */
import dataSource from '../src/database/data-source';
import {
  categoryOf,
  EXAMPLES,
  nutritionTable,
} from '../src/products/nutrition-examples';

interface Row {
  id: number;
  slug: string;
  ingredients: string;
  allergens: string;
  nutrition_info: string | null;
  tags: string | null;
}

async function main() {
  // En producción solo con --allow-production: son valores inventados, y quien los carga en un
  // servidor tiene que decidirlo a propósito (por ejemplo, junto con `seed --catalog-only`).
  if (
    process.env.NODE_ENV === 'production' &&
    !process.argv.includes('--allow-production')
  ) {
    throw new Error(
      'Son datos de ejemplo: en producción este script solo corre con --allow-production.',
    );
  }
  const undo = process.argv.includes('--undo');
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun && !process.argv.includes('--yes')) {
    throw new Error(
      'Este script cambia datos. Hacé un respaldo y confirmá con --yes (o probá con --dry-run).',
    );
  }

  await dataSource.initialize();
  try {
    const database = String(dataSource.options.database);
    const rows = await dataSource.query<Row[]>(
      `SELECT p.id, p.slug, p.ingredients, p.allergens, p.nutrition_info,
              GROUP_CONCAT(t.slug) AS tags
       FROM products p
       LEFT JOIN product_tags pt ON pt.product_id = p.id
       LEFT JOIN tags t ON t.id = pt.tag_id
       GROUP BY p.id ORDER BY p.id`,
    );

    const changes: {
      id: number;
      slug: string;
      set: Record<string, string | null>;
    }[] = [];
    const skipped: string[] = [];
    for (const row of rows) {
      const category = categoryOf(row.tags ? row.tags.split(',') : []);
      if (!category) {
        skipped.push(row.slug);
        continue;
      }
      const example = EXAMPLES[category];
      const table = nutritionTable(category);
      const set: Record<string, string | null> = {};
      if (undo) {
        // Solo se revierte lo que sigue exactamente igual: si alguien lo editó después, se respeta.
        if (row.nutrition_info === table) set.nutrition_info = null;
        if (row.ingredients === example.ingredients) set.ingredients = '';
        if (row.allergens === example.allergens) set.allergens = '';
      } else {
        if (!row.nutrition_info?.trim()) set.nutrition_info = table;
        if (!row.ingredients.trim()) set.ingredients = example.ingredients;
        if (!row.allergens.trim()) set.allergens = example.allergens;
      }
      if (Object.keys(set).length > 0)
        changes.push({ id: row.id, slug: row.slug, set });
    }

    process.stdout.write(
      `${dryRun ? '[dry-run] ' : ''}${undo ? 'Deshacer' : 'Aplicar'} en ${database}: ${changes.length} productos.\n`,
    );
    for (const change of changes) {
      process.stdout.write(
        `  ${change.slug}: ${Object.keys(change.set).join(', ')}\n`,
      );
    }
    if (skipped.length) {
      process.stdout.write(
        `Sin categoría (no se tocan): ${skipped.join(', ')}\n`,
      );
    }
    if (dryRun || changes.length === 0) return;

    await dataSource.transaction(async (manager) => {
      for (const change of changes) {
        const columns = Object.keys(change.set);
        await manager.query(
          `UPDATE products SET ${columns.map((column) => `\`${column}\` = ?`).join(', ')} WHERE id = ?`,
          [...columns.map((column) => change.set[column]), change.id],
        );
        await manager.query(
          `INSERT INTO admin_audit_log (admin_id, action, entity, entity_id, changes) VALUES (NULL, ?, 'product', ?, ?)`,
          [
            undo
              ? 'product.nutrition_example_undo'
              : 'product.nutrition_example',
            change.id,
            JSON.stringify({
              fields: columns,
              source: 'scripts/nutrition-examples.ts',
            }),
          ],
        );
      }
    });
    process.stdout.write('Listo.\n');
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

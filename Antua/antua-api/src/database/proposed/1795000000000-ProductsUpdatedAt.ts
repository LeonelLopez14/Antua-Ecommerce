import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROPUESTA (Fase 16), NO APLICADA. Escrita a mano. Agrega `products.updated_at` para que el sitemap
 * tenga un lastmod real. Detalle, EXPLAIN, riesgo y comando: docs/migraciones-pendientes.md.
 *
 * - La columna se agrega con ALGORITHM=INSTANT: no copia la tabla ni la bloquea (solo toma un
 *   bloqueo de metadatos por un instante). Si MySQL no pudiera hacerlo al instante, la migración falla en vez
 *   de copiar la tabla en silencio.
 * - Las filas existentes toman la fecha del último cambio registrado en la auditoría del panel. Las
 *   que nunca se editaron desde el panel quedan con la fecha en que se aplica la migración.
 * - El sitemap ya la usa si existe (src/seo/seo.controller.ts), así que no hay que tocar código.
 *
 * Para aplicarla: leela, movela a src/database/migrations/ y corré `pnpm migration:run`. En el mismo
 * cambio agregá a src/products/entities/product.entity.ts:
 *   @UpdateDateColumn({ type: 'datetime', precision: 6 })
 *   updated_at: Date;
 * Sin eso, `migration:generate` propondría BORRAR la columna, porque la entidad no la conoce.
 */
export class ProductsUpdatedAt1795000000000 implements MigrationInterface {
  name = 'ProductsUpdatedAt1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `products` ADD COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ALGORITHM=INSTANT',
    );
    // Asignar updated_at a mano evita que ON UPDATE lo pise con la hora actual.
    await queryRunner.query(
      "UPDATE `products` p JOIN (SELECT `entity_id`, MAX(`created_at`) AS `last` FROM `admin_audit_log` WHERE `entity` = 'product' AND `entity_id` IS NOT NULL GROUP BY `entity_id`) a ON a.`entity_id` = p.`id` SET p.`updated_at` = a.`last`",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `products` DROP COLUMN `updated_at`, ALGORITHM=INSTANT',
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROPUESTA (Fase 13), NO APLICADA. Escrita a mano, no generada. Solo agrega índices: no toca datos
 * ni columnas, y se revierte con `migration:revert`.
 *
 * Por qué (EXPLAIN sobre antua_db, ver docs/qa/informe-qa.md):
 * - "Mis pedidos" (WHERE userId = ? ORDER BY created_at DESC) usaba el índice de userId y después
 *   ordenaba en memoria (filesort). Con (userId, created_at) sale ya ordenado.
 * - El panel y el resumen filtran por rango de fechas (created_at >= ?): hoy recorren toda la tabla.
 * - El vencimiento de pagos (cada 10 minutos) busca status + payment_status + payment_expires_at:
 *   hoy recorre toda la tabla.
 *
 * Para aplicarla: leela, movela a src/database/migrations/ y corré `pnpm migration:run`.
 * Después agregá en src/orders/entities/order.entity.ts, arriba de la clase:
 *   @Index('IDX_orders_user_created', ['user', 'created_at'])
 *   @Index('IDX_orders_created', ['created_at'])
 *   @Index('IDX_orders_status_payment', ['status', 'payment_status', 'payment_expires_at'])
 * así `migration:generate` no la vuelve a proponer.
 */
export class OrdersIndexes1794900000000 implements MigrationInterface {
  name = 'OrdersIndexes1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `IDX_orders_user_created` ON `orders` (`userId`, `created_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_orders_created` ON `orders` (`created_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_orders_status_payment` ON `orders` (`status`, `payment_status`, `payment_expires_at`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_orders_status_payment` ON `orders`',
    );
    await queryRunner.query('DROP INDEX `IDX_orders_created` ON `orders`');
    // El índice de la FK de userId lo creó MySQL solo (InitialSchema no lo declara), y MySQL borra en
    // silencio ese tipo de índice cuando otro puede sostener la FK: el (userId, created_at) del up.
    // Sin recrearlo, el DROP falla con "needed in a foreign key constraint" (1553). Se recrea con el
    // nombre de la FK, que es el que tenía, y solo si falta.
    const [userIndex] = (await queryRunner.query(
      "SELECT COUNT(DISTINCT INDEX_NAME) AS found FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'userId' AND SEQ_IN_INDEX = 1 AND INDEX_NAME <> 'IDX_orders_user_created'",
    )) as { found: string | number }[];
    if (Number(userIndex?.found) === 0) {
      await queryRunner.query(
        'CREATE INDEX `FK_151b79a83ba240b0cb31b2302d1` ON `orders` (`userId`)',
      );
    }
    await queryRunner.query('DROP INDEX `IDX_orders_user_created` ON `orders`');
  }
}

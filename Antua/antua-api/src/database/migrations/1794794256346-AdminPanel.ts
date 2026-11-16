import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminPanel1794794256346 implements MigrationInterface {
  name = 'AdminPanel1794794256346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE \`admin_audit_log\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`action\` varchar(50) NOT NULL,
                \`entity\` varchar(50) NOT NULL,
                \`entity_id\` int NULL,
                \`changes\` json NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`admin_id\` int NULL,
                INDEX \`IDX_f5c04c9384762261d79b65c6e5\` (\`created_at\`),
                INDEX \`IDX_b89517c6c472f7b9bf405fce7e\` (\`entity\`, \`entity_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`order_status_history\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`from_status\` varchar(20) NOT NULL,
                \`to_status\` varchar(20) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`order_id\` int NULL,
                \`changed_by_id\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_images\`
            ADD \`is_primary\` tinyint NOT NULL DEFAULT 0
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_images\`
            ADD \`file_name\` varchar(100) NULL
        `);
    // Cada producto con imágenes arranca con la primera (menor sort_order) como principal.
    await queryRunner.query(`
            UPDATE \`product_images\` pi
            JOIN (
                SELECT \`productId\`, MIN(\`id\`) AS \`id\`
                FROM \`product_images\` x
                WHERE x.\`sort_order\` = (
                    SELECT MIN(y.\`sort_order\`) FROM \`product_images\` y WHERE y.\`productId\` = x.\`productId\`
                )
                GROUP BY \`productId\`
            ) first ON first.\`id\` = pi.\`id\`
            SET pi.\`is_primary\` = 1
        `);
    await queryRunner.query(`
            ALTER TABLE \`tags\`
            ADD \`is_active\` tinyint NOT NULL DEFAULT 1
        `);
    await queryRunner.query(`
            ALTER TABLE \`products\`
            ADD \`nutrition_info\` text NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`reviews\`
            ADD \`is_hidden\` tinyint NOT NULL DEFAULT 0
        `);
    await queryRunner.query(`
            ALTER TABLE \`orders\`
            ADD \`internal_note\` text NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD \`role\` enum ('customer', 'admin') NOT NULL DEFAULT 'customer'
        `);
    // MODIFY amplía la columna sin perder datos (TypeORM generaba DROP + ADD).
    await queryRunner.query(`
            ALTER TABLE \`products\` MODIFY \`ingredients\` varchar(500) NOT NULL
        `);
    // MODIFY amplía la columna sin perder datos (TypeORM generaba DROP + ADD).
    await queryRunner.query(`
            ALTER TABLE \`products\` MODIFY \`allergens\` varchar(255) NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`admin_audit_log\`
            ADD CONSTRAINT \`FK_fae3c2a824a6f5fa62a475f3f4e\` FOREIGN KEY (\`admin_id\`) REFERENCES \`users\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`order_status_history\`
            ADD CONSTRAINT \`FK_1ca7d5228cf9dc589b60243933c\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`order_status_history\`
            ADD CONSTRAINT \`FK_078644fd27c969e266344e972d6\` FOREIGN KEY (\`changed_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`order_status_history\` DROP FOREIGN KEY \`FK_078644fd27c969e266344e972d6\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`order_status_history\` DROP FOREIGN KEY \`FK_1ca7d5228cf9dc589b60243933c\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`admin_audit_log\` DROP FOREIGN KEY \`FK_fae3c2a824a6f5fa62a475f3f4e\`
        `);
    // Si algún texto ya no entra, MySQL rechaza la reversión en vez de cortarlo.
    await queryRunner.query(`
            ALTER TABLE \`products\` MODIFY \`allergens\` varchar(100) NOT NULL
        `);
    // Si algún texto ya no entra, MySQL rechaza la reversión en vez de cortarlo.
    await queryRunner.query(`
            ALTER TABLE \`products\` MODIFY \`ingredients\` varchar(100) NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`users\` DROP COLUMN \`role\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`orders\` DROP COLUMN \`internal_note\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`reviews\` DROP COLUMN \`is_hidden\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`products\` DROP COLUMN \`nutrition_info\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`tags\` DROP COLUMN \`is_active\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_images\` DROP COLUMN \`file_name\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_images\` DROP COLUMN \`is_primary\`
        `);
    await queryRunner.query(`
            DROP TABLE \`order_status_history\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_b89517c6c472f7b9bf405fce7e\` ON \`admin_audit_log\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_f5c04c9384762261d79b65c6e5\` ON \`admin_audit_log\`
        `);
    await queryRunner.query(`
            DROP TABLE \`admin_audit_log\`
        `);
  }
}

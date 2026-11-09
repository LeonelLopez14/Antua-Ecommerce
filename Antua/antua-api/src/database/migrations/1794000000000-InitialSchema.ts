import { MigrationInterface, QueryRunner } from 'typeorm';

/** Esquema completo a la fecha de adopción de migraciones (reemplaza a `synchronize`). */

export class InitialSchema1794000000000 implements MigrationInterface {
  name = 'InitialSchema1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // La base de desarrollo ya tiene estas tablas (las creó `synchronize`): solo se registra la migración.
    if (await queryRunner.hasTable('users')) return;

    await queryRunner.query(`
            CREATE TABLE \`product_variants\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(50) NOT NULL,
                \`price\` decimal(10, 2) NOT NULL,
                \`stock\` int NOT NULL,
                \`is_active\` tinyint NOT NULL DEFAULT 1,
                \`sku\` varchar(255) NOT NULL,
                \`productId\` int NULL,
                UNIQUE INDEX \`IDX_46f236f21640f9da218a063a86\` (\`sku\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`product_images\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`url\` varchar(255) NOT NULL,
                \`sort_order\` int NOT NULL,
                \`productId\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`tags\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(50) NOT NULL,
                \`slug\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` (\`slug\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`product_tags\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`product_id\` int NULL,
                \`tag_id\` int NULL,
                UNIQUE INDEX \`IDX_8ca809b37ff76596b63fe60ac4\` (\`product_id\`, \`tag_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`products\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(155) NOT NULL,
                \`slug\` varchar(100) NOT NULL,
                \`ingredients\` varchar(100) NOT NULL,
                \`allergens\` varchar(100) NOT NULL,
                \`description\` text NOT NULL,
                \`base_price\` decimal(10, 2) NOT NULL,
                \`is_active\` tinyint NOT NULL DEFAULT 1,
                UNIQUE INDEX \`IDX_464f927ae360106b783ed0b410\` (\`slug\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`reviews\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`comment\` text NULL,
                \`rating\` int NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`productId\` int NULL,
                \`userId\` int NULL,
                UNIQUE INDEX \`IDX_9007ffba411fd471dfe233dabf\` (\`productId\`, \`userId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`cart_items\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`quantity\` int NOT NULL DEFAULT '1',
                \`unit_price_snapshot\` decimal(10, 2) NOT NULL,
                \`cartId\` int NULL,
                \`variantId\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`carts\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`guest_token\` varchar(255) NULL,
                \`userId\` int NULL,
                \`couponId\` int NULL,
                UNIQUE INDEX \`IDX_be65dcd886ccd9393bda1e1823\` (\`guest_token\`),
                UNIQUE INDEX \`REL_69828a178f152f157dcf2f70a8\` (\`userId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`coupons\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`code\` varchar(50) NOT NULL,
                \`discount_type\` varchar(50) NOT NULL,
                \`discount_value\` decimal(10, 2) NOT NULL,
                \`min_order_amount\` decimal(10, 2) NULL,
                \`usage_limit\` int NULL,
                \`valid_until\` timestamp NOT NULL,
                \`valid_from\` timestamp NOT NULL,
                \`times_used\` int NOT NULL DEFAULT '0',
                \`is_active\` tinyint NOT NULL DEFAULT 1,
                UNIQUE INDEX \`IDX_e025109230e82925843f2a14c4\` (\`code\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`order_items\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`product_name_snapshot\` varchar(155) NOT NULL,
                \`unit_price_snapshot\` decimal(10, 2) NOT NULL,
                \`quantity\` int NOT NULL DEFAULT '1',
                \`orderId\` int NULL,
                \`variantId\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`payments\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`method\` varchar(100) NOT NULL,
                \`transaction_ref\` varchar(100) NULL,
                \`paid_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`status\` varchar(30) NOT NULL,
                \`order_id\` int NULL,
                UNIQUE INDEX \`REL_b2f7b823a21562eeca20e72b00\` (\`order_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`orders\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`guest_email\` varchar(150) NULL,
                \`status\` enum (
                    'pending',
                    'preparing',
                    'shipped',
                    'delivered',
                    'canceled'
                ) NOT NULL DEFAULT 'pending',
                \`payment_status\` varchar(50) NOT NULL DEFAULT 'pending',
                \`shipping_full_name\` varchar(200) NOT NULL,
                \`shipping_phone\` varchar(50) NOT NULL,
                \`shipping_street\` varchar(200) NOT NULL,
                \`shipping_city\` varchar(100) NOT NULL,
                \`shipping_postal_code\` varchar(20) NOT NULL,
                \`subtotal\` decimal(10, 2) NOT NULL,
                \`discount_amount\` decimal(10, 2) NOT NULL DEFAULT '0.00',
                \`shipping_amount\` decimal(10, 2) NOT NULL,
                \`total\` decimal(10, 2) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`userId\` int NULL,
                \`couponId\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`users\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`full_name\` varchar(155) NOT NULL,
                \`email\` varchar(155) NOT NULL,
                \`password_hash\` varchar(255) NOT NULL,
                \`phone\` varchar(20) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`addresses\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`label\` varchar(50) NULL,
                \`street\` varchar(200) NOT NULL,
                \`city\` varchar(200) NOT NULL,
                \`postal_code\` varchar(20) NOT NULL,
                \`country\` varchar(200) NOT NULL,
                \`is_default\` tinyint NOT NULL DEFAULT 0,
                \`userId\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_variants\`
            ADD CONSTRAINT \`FK_f515690c571a03400a9876600b5\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_images\`
            ADD CONSTRAINT \`FK_b367708bf720c8dd62fc6833161\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_tags\`
            ADD CONSTRAINT \`FK_5b0c6fc53c574299ecc7f9ee22e\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`product_tags\`
            ADD CONSTRAINT \`FK_f2cd3faf2e129a4c69c05a291e8\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`reviews\`
            ADD CONSTRAINT \`FK_a6b3c434392f5d10ec171043666\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`reviews\`
            ADD CONSTRAINT \`FK_7ed5659e7139fc8bc039198cc1f\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`cart_items\`
            ADD CONSTRAINT \`FK_edd714311619a5ad09525045838\` FOREIGN KEY (\`cartId\`) REFERENCES \`carts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`cart_items\`
            ADD CONSTRAINT \`FK_5a27845bc2d79be6f1fa3d2c036\` FOREIGN KEY (\`variantId\`) REFERENCES \`product_variants\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`carts\`
            ADD CONSTRAINT \`FK_69828a178f152f157dcf2f70a89\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`carts\`
            ADD CONSTRAINT \`FK_726fbc87f273ca7511d1e568e55\` FOREIGN KEY (\`couponId\`) REFERENCES \`coupons\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`order_items\`
            ADD CONSTRAINT \`FK_f1d359a55923bb45b057fbdab0d\` FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`order_items\`
            ADD CONSTRAINT \`FK_516736b9807228bb17b2d0a3e2a\` FOREIGN KEY (\`variantId\`) REFERENCES \`product_variants\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD CONSTRAINT \`FK_b2f7b823a21562eeca20e72b006\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`orders\`
            ADD CONSTRAINT \`FK_151b79a83ba240b0cb31b2302d1\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`orders\`
            ADD CONSTRAINT \`FK_c26db6c65929ecfeab91073e80c\` FOREIGN KEY (\`couponId\`) REFERENCES \`coupons\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`addresses\`
            ADD CONSTRAINT \`FK_95c93a584de49f0b0e13f753630\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public down(): Promise<void> {
    // Revertir el esquema inicial borraría todos los datos: no se hace nunca desde una migración.
    return Promise.reject(new Error('La migración inicial no se revierte.'));
  }
}

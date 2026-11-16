import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentsModule1794185878079 implements MigrationInterface {
  name = 'PaymentsModule1794185878079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Un pedido pasa a admitir varios pagos: se quita el índice único de order_id.
    // MySQL exige soltar antes la clave foránea que lo usa; al volver a crearla, arma un índice común.
    await queryRunner.query(`
            ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_b2f7b823a21562eeca20e72b006\`
        `);
    await queryRunner.query(`
            DROP INDEX \`REL_b2f7b823a21562eeca20e72b00\` ON \`payments\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD CONSTRAINT \`FK_b2f7b823a21562eeca20e72b006\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD \`amount\` decimal(10, 2) NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD \`currency\` varchar(3) NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        `);
    await queryRunner.query(`
            ALTER TABLE \`orders\`
            ADD \`payment_expires_at\` datetime NULL
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD UNIQUE INDEX \`IDX_c9f713bf30bb8bcea32a5df516\` (\`transaction_ref\`)
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\` CHANGE \`paid_at\` \`paid_at\` datetime NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`payments\` CHANGE \`paid_at\` \`paid_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\` DROP INDEX \`IDX_c9f713bf30bb8bcea32a5df516\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`orders\` DROP COLUMN \`payment_expires_at\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\` DROP COLUMN \`created_at\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\` DROP COLUMN \`currency\`
        `);
    await queryRunner.query(`
            ALTER TABLE \`payments\` DROP COLUMN \`amount\`
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX \`REL_b2f7b823a21562eeca20e72b00\` ON \`payments\` (\`order_id\`)
        `);
  }
}

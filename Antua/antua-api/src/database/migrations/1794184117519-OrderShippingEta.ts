import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderShippingEta1794184117519 implements MigrationInterface {
  name = 'OrderShippingEta1794184117519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`orders\`
            ADD \`shipping_eta_days\` int NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`orders\` DROP COLUMN \`shipping_eta_days\`
        `);
  }
}

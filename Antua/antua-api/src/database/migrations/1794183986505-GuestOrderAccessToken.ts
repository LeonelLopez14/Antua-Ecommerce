import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestOrderAccessToken1794183986505 implements MigrationInterface {
  name = 'GuestOrderAccessToken1794183986505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`orders\`
            ADD \`guest_access_token_hash\` char(64) NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`orders\` DROP COLUMN \`guest_access_token_hash\`
        `);
  }
}

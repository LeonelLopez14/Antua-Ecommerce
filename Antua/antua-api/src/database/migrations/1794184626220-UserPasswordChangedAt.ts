import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPasswordChangedAt1794184626220 implements MigrationInterface {
  name = 'UserPasswordChangedAt1794184626220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\`
            ADD \`password_changed_at\` datetime NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`users\` DROP COLUMN \`password_changed_at\`
        `);
  }
}

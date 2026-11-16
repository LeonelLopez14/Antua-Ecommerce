import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetTokens1794184840869 implements MigrationInterface {
  name = 'PasswordResetTokens1794184840869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE \`password_reset_tokens\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`token_hash\` char(64) NOT NULL,
                \`expires_at\` datetime NOT NULL,
                \`used_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`userId\` int NOT NULL,
                UNIQUE INDEX \`IDX_91185d86d5d7557b19abbb2868\` (\`token_hash\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            ALTER TABLE \`password_reset_tokens\`
            ADD CONSTRAINT \`FK_d6a19d4b4f6c62dcd29daa497e2\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`password_reset_tokens\` DROP FOREIGN KEY \`FK_d6a19d4b4f6c62dcd29daa497e2\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_91185d86d5d7557b19abbb2868\` ON \`password_reset_tokens\`
        `);
    await queryRunner.query(`
            DROP TABLE \`password_reset_tokens\`
        `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewsletterSubscribers1794185092778 implements MigrationInterface {
  name = 'NewsletterSubscribers1794185092778';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE \`newsletter_subscribers\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`email\` varchar(155) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_0dc48416511f011f7de7b2a8f8\` (\`email\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX \`IDX_0dc48416511f011f7de7b2a8f8\` ON \`newsletter_subscribers\`
        `);
    await queryRunner.query(`
            DROP TABLE \`newsletter_subscribers\`
        `);
  }
}

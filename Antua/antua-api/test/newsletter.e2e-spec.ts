import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, resetDatabase, TestApp } from './helpers';

describe('POST /newsletter/subscribe', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const subscribe = (email: string) =>
    request(app.getHttpServer()).post('/newsletter/subscribe').send({ email });

  it('no revela si el email ya estaba y no lo duplica', async () => {
    const first = await subscribe('a@antua.test').expect(200);
    const again = await subscribe('A@antua.test').expect(200);
    expect(again.body).toEqual(first.body);
    const rows: unknown[] = await db.query(
      'SELECT id FROM newsletter_subscribers',
    );
    expect(rows).toHaveLength(1);
  });

  it('valida el email', async () => {
    await subscribe('no-es-un-email').expect(400);
  });
});

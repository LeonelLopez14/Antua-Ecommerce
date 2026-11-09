import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  registerUser,
  resetDatabase,
  sentMails,
  TestApp,
} from './helpers';

describe('cuenta', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const auth = (token: string) => `Bearer ${token}`;

  describe('perfil', () => {
    it('GET /users/me nunca devuelve datos sensibles', async () => {
      const { token } = await registerUser(app, 'a@antua.test');
      const res = await request(server())
        .get('/users/me')
        .set('Authorization', auth(token))
        .expect(200);
      expect(res.body).toMatchObject({ email: 'a@antua.test' });
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('password_changed_at');
    });

    it('PATCH /users/me actualiza nombre y teléfono, y solo eso', async () => {
      const { token } = await registerUser(app, 'a@antua.test');
      const res = await request(server())
        .patch('/users/me')
        .set('Authorization', auth(token))
        .send({
          full_name: 'Nombre Nuevo',
          phone: '+598 99 123 456',
          email: 'otra@antua.test',
        })
        .expect(200);
      expect(res.body).toMatchObject({
        full_name: 'Nombre Nuevo',
        phone: '+598 99 123 456',
        email: 'a@antua.test',
      });
    });

    it('valida el teléfono y exige sesión', async () => {
      const { token } = await registerUser(app, 'a@antua.test');
      await request(server())
        .patch('/users/me')
        .set('Authorization', auth(token))
        .send({ phone: '<script>' })
        .expect(400);
      await request(server()).get('/users/me').expect(401);
    });
  });

  describe('cambio de contraseña', () => {
    const change = (
      token: string,
      currentPassword: string,
      newPassword: string,
    ) =>
      request(server())
        .post('/auth/change-password')
        .set('Authorization', auth(token))
        .send({ currentPassword, newPassword });

    it('exige la contraseña actual', async () => {
      const { token } = await registerUser(app, 'a@antua.test');
      await change(token, 'equivocada1', 'NuevaClave123').expect(401);
    });

    it('aplica la política mínima', async () => {
      const { token } = await registerUser(app, 'a@antua.test');
      for (const weak of ['corta1', 'sololetras', '1234567890']) {
        await change(token, 'ClaveSegura123', weak).expect(400);
      }
    });

    it('cambia la contraseña e invalida las sesiones anteriores', async () => {
      const { token } = await registerUser(app, 'a@antua.test');
      // iat tiene precisión de segundos: la sesión vieja tiene que ser de antes.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const res = await change(token, 'ClaveSegura123', 'NuevaClave123').expect(
        200,
      );
      const newToken = (res.body as { token: string }).token;

      await request(server())
        .get('/users/me')
        .set('Authorization', auth(token))
        .expect(401);
      await request(server())
        .get('/users/me')
        .set('Authorization', auth(newToken))
        .expect(200);
      await request(server())
        .post('/auth/login')
        .send({ email: 'a@antua.test', password: 'NuevaClave123' })
        .expect(201);
      await request(server())
        .post('/auth/login')
        .send({ email: 'a@antua.test', password: 'ClaveSegura123' })
        .expect(401);
    });
  });

  describe('recuperación de contraseña', () => {
    const forgot = (email: string) =>
      request(server()).post('/auth/forgot-password').send({ email });
    const reset = (token: string, newPassword = 'NuevaClave123') =>
      request(server())
        .post('/auth/reset-password')
        .send({ token, newPassword });
    const login = (password: string) =>
      request(server())
        .post('/auth/login')
        .send({ email: 'a@antua.test', password });

    /** El envío corre en segundo plano: espera a que llegue el mail. */
    const tokenFromMail = async (expected = 1) => {
      for (let i = 0; i < 100 && sentMails.length < expected; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const match = /token=([\w-]+)/.exec(sentMails.at(-1)?.text ?? '');
      if (!match) throw new Error('No llegó el mail');
      return match[1];
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

    beforeEach(() => {
      sentMails.length = 0;
    });

    it('responde exactamente igual exista o no la cuenta', async () => {
      await registerUser(app, 'a@antua.test');
      const exists = await forgot('a@antua.test').expect(200);
      const missing = await forgot('nadie@antua.test').expect(200);
      expect(missing.body).toEqual(exists.body);
      await tokenFromMail();
      await settle();
      expect(sentMails.map((mail) => mail.to)).toEqual(['a@antua.test']);
    });

    it('guarda solo el hash del token', async () => {
      await registerUser(app, 'a@antua.test');
      await forgot('a@antua.test').expect(200);
      const token = await tokenFromMail();
      const rows: { token_hash: string }[] = await db.query(
        'SELECT token_hash FROM password_reset_tokens',
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].token_hash).not.toBe(token);
      expect(rows[0].token_hash).toHaveLength(64);
    });

    it('restablece la contraseña y el token sirve una sola vez', async () => {
      await registerUser(app, 'a@antua.test');
      await forgot('a@antua.test').expect(200);
      const token = await tokenFromMail();

      await reset(token).expect(200);
      await login('NuevaClave123').expect(201);
      await login('ClaveSegura123').expect(401);
      await reset(token, 'OtraClave456').expect(400);
    });

    it('rechaza un token vencido, uno inventado y una contraseña débil', async () => {
      await registerUser(app, 'a@antua.test');
      await forgot('a@antua.test').expect(200);
      const token = await tokenFromMail();

      await reset(token, 'debil').expect(400);
      await reset('token-inventado').expect(400);
      await db.query(
        'UPDATE password_reset_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      );
      await reset(token).expect(400);
    });

    it('un link nuevo anula el anterior', async () => {
      await registerUser(app, 'a@antua.test');
      await forgot('a@antua.test').expect(200);
      const first = await tokenFromMail(1);
      await forgot('a@antua.test').expect(200);
      const second = await tokenFromMail(2);

      await reset(first).expect(400);
      await reset(second).expect(200);
    });

    it('limita los pedidos por cuenta y por hora', async () => {
      await registerUser(app, 'a@antua.test');
      for (let i = 1; i <= 3; i++) {
        await forgot('a@antua.test').expect(200);
        await tokenFromMail(i);
      }
      await db.query(
        "INSERT INTO password_reset_tokens (token_hash, expires_at, userId) SELECT REPEAT('a', 64), NOW() + INTERVAL 1 HOUR, id FROM users LIMIT 1",
      );
      await db.query(
        "INSERT INTO password_reset_tokens (token_hash, expires_at, used_at, userId) SELECT REPEAT('b', 64), NOW() + INTERVAL 1 HOUR, NOW(), id FROM users LIMIT 1",
      );
      await db.query(
        "INSERT INTO password_reset_tokens (token_hash, expires_at, used_at, userId) SELECT REPEAT('c', 64), NOW() + INTERVAL 1 HOUR, NOW(), id FROM users LIMIT 1",
      );
      const before = sentMails.length;
      await forgot('a@antua.test').expect(200);
      await settle();
      expect(sentMails).toHaveLength(before);
    });
  });
});

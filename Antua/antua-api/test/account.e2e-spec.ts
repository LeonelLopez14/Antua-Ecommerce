import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, registerUser, resetDatabase, TestApp } from './helpers';

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
});

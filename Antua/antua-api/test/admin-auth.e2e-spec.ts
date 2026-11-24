import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  listRoutes,
  registerAdmin,
  registerUser,
  resetDatabase,
  TestApp,
} from './helpers';

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/**
 * Matriz de autorización: recorre TODAS las rutas /admin registradas en la app.
 * Si alguien agrega un endpoint /admin y se olvida del rol, este test falla.
 */
describe('autorización de /admin', () => {
  let app: TestApp;
  let db: DataSource;
  let customerToken: string;
  let adminToken: string;
  let adminRoutes: { method: Method; path: string }[];

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    await resetDatabase(db);
    customerToken = (await registerUser(app, 'cliente@antojarte.example'))
      .token;
    adminToken = (await registerAdmin(app, db)).token;
    adminRoutes = listRoutes(app)
      .filter(({ path }) => /^\/admin(\/|$)/.test(path))
      .map(({ method, path }) => ({
        method: method as Method,
        // Los parámetros se completan con un id que no existe: alcanza para probar el acceso.
        path: path.replace(/:[a-zA-Z]+/g, '999999'),
      }));
  });
  afterAll(() => app.close());

  const call = (method: Method, path: string, token?: string) => {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('hay rutas /admin para probar', () => {
    expect(adminRoutes.length).toBeGreaterThan(0);
  });

  it('sin token: 401 en todas', async () => {
    for (const { method, path } of adminRoutes) {
      const res = await call(method, path);
      expect({ method, path, status: res.status }).toEqual({
        method,
        path,
        status: 401,
      });
    }
  });

  it('con un token inválido: 401 en todas', async () => {
    for (const { method, path } of adminRoutes) {
      const res = await call(method, path, 'no-es-un-jwt');
      expect({ method, path, status: res.status }).toEqual({
        method,
        path,
        status: 401,
      });
    }
  });

  it('como customer: 403 en todas', async () => {
    for (const { method, path } of adminRoutes) {
      const res = await call(method, path, customerToken);
      expect({ method, path, status: res.status }).toEqual({
        method,
        path,
        status: 403,
      });
    }
  });

  it('como admin: ninguna responde 401 ni 403', async () => {
    for (const { method, path } of adminRoutes) {
      const res = await call(method, path, adminToken);
      expect({ method, path, denied: [401, 403].includes(res.status) }).toEqual(
        {
          method,
          path,
          denied: false,
        },
      );
    }
  });

  it('el rol se lee de la base en cada request: al quitarlo, el mismo token deja de servir', async () => {
    const session = await registerAdmin(app, db, 'ex-admin@antojarte.example');
    await call('get', '/admin/audit', session.token).expect(200);
    await db.query("UPDATE users SET role = 'customer' WHERE id = ?", [
      session.user.id,
    ]);
    await call('get', '/admin/audit', session.token).expect(403);
  });

  it('nadie se vuelve admin desde la web: el registro y el perfil ignoran `role`', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        full_name: 'Intruso',
        email: 'intruso@antojarte.example',
        password: 'ClaveSegura123',
        role: 'admin',
      })
      .expect(201);
    const { token, user } = res.body as {
      token: string;
      user: { role: string };
    };
    expect(user.role).toBe('customer');

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ full_name: 'Intruso', role: 'admin' })
      .expect(200);
    await call('get', '/admin/audit', token).expect(403);
  });
});

/** Denegar por defecto: un controller bajo /admin al que alguien se olvidó de ponerle @Roles. */
@Controller('admin/olvidado')
class ForgottenController {
  @Get()
  find() {
    return { ok: true };
  }
}

describe('una ruta /admin sin @Roles', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ForgottenController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await resetDatabase(db);
  });
  afterAll(() => app.close());

  it('responde 401 sin token y 403 incluso para un admin', async () => {
    const { token } = await registerAdmin(app, db);
    await request(app.getHttpServer()).get('/admin/olvidado').expect(401);
    await request(app.getHttpServer())
      .get('/admin/olvidado')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

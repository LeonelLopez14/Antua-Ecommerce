import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { createTestApp, registerUser, resetDatabase, TestApp } from './helpers';

/**
 * Sesiones con JWT: qué tokens acepta la API y cuáles no. Complementa:
 * - admin-auth.e2e-spec.ts: matriz de /admin, rol leído de la base, registro y perfil ignoran `role`;
 * - account.e2e-spec.ts: cambio de contraseña que invalida sesiones, tokens de recuperación;
 * - orders.e2e-spec.ts: token de acceso del invitado (de un solo uso al reclamar, plazo de 24 h).
 */
describe('sesiones y tokens', () => {
  let app: TestApp;
  let db: DataSource;
  let secret: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    secret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET');
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const me = (token: string) =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
  const b64 = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const nowSeconds = () => Math.floor(Date.now() / 1000);

  it('acepta el token que emite el login', async () => {
    const { token } = await registerUser(app, 'ana@antojarte.example');
    await me(token).expect(200);
  });

  it('rechaza un JWT vencido, aunque la firma sea válida', async () => {
    const { user } = await registerUser(app, 'ana@antojarte.example');
    const expired = new JwtService({ secret }).sign(
      { sub: user.id, iat: nowSeconds() - 120 },
      { algorithm: 'HS256', expiresIn: 60 },
    );
    await me(expired).expect(401);
  });

  it('rechaza un JWT firmado con otra clave', async () => {
    const { user } = await registerUser(app, 'ana@antojarte.example');
    const forged = new JwtService({
      secret: 'una-clave-que-no-es-la-de-la-api-0123456789',
    }).sign({ sub: user.id });
    await me(forged).expect(401);
  });

  it('rechaza un JWT con el contenido cambiado (otro `sub` con la firma original)', async () => {
    const ana = await registerUser(app, 'ana@antojarte.example');
    const bea = await registerUser(app, 'bea@antojarte.example');
    const [header, payload, signature] = ana.token.split('.');
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as Record<string, unknown>;
    const tampered = [
      header,
      b64({ ...claims, sub: bea.user.id }),
      signature,
    ].join('.');
    await me(tampered).expect(401);
  });

  it('rechaza `alg: none` y cualquier algoritmo distinto de HS256', async () => {
    const { user } = await registerUser(app, 'ana@antojarte.example');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, iat: nowSeconds() })}.`;
    await me(unsigned).expect(401);
    // Con la clave correcta, pero HS512: la API solo acepta el algoritmo con el que firma.
    const hs512 = new JwtService({ secret }).sign(
      { sub: user.id },
      { algorithm: 'HS512' },
    );
    await me(hs512).expect(401);
  });

  it('rechaza basura, un esquema distinto de Bearer y el token en la URL', async () => {
    const { token } = await registerUser(app, 'ana@antojarte.example');
    await me('no-es-un-jwt').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Token ${token}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/auth/me?access_token=${token}`)
      .expect(401);
  });

  it('un usuario borrado deja de entrar aunque su token no haya vencido', async () => {
    const { token, user } = await registerUser(app, 'ana@antojarte.example');
    await me(token).expect(200);
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.getRepository(User).delete(user.id);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    await me(token).expect(401);
  });

  it('el rol nunca sale del token: un JWT válido que dice "admin" no abre /admin', async () => {
    const { user } = await registerUser(app, 'ana@antojarte.example');
    // Simula un token emitido por error con un rol: la API lo ignora y lee el rol de la base.
    const withRole = new JwtService({ secret }).sign(
      { sub: user.id, role: 'admin' },
      { algorithm: 'HS256' },
    );
    await me(withRole).expect(200);
    await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${withRole}`)
      .expect(403);
  });

  /**
   * Cerrar sesión borra el token del navegador (authStore.clearSession, con test en el front). La API
   * no guarda sesiones: un token copiado antes de cerrar sesión sigue valiendo hasta que vence
   * (JWT_EXPIRES_IN, 7 días por defecto) o hasta que se cambia la contraseña. Riesgo aceptado y
   * documentado en docs/seguridad.md; este test fija el comportamiento para que un cambio se note.
   */
  it('sin revocación en el servidor: el token vale hasta vencer, salvo que cambie la contraseña', async () => {
    const { token } = await registerUser(app, 'ana@antojarte.example');
    await me(token).expect(200); // "cerrar sesión" no llama a la API
    await new Promise((resolve) => setTimeout(resolve, 1100)); // iat tiene segundos
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'ClaveSegura123', newPassword: 'OtraClave456' })
      .expect(200);
    await me(token).expect(401);
  });
});

/**
 * Enumeración de cuentas: ¿se puede saber si un email tiene cuenta? Login y recuperación responden
 * igual (contenido y tiempos parecidos). El registro SÍ lo revela (409): decisión documentada en
 * docs/seguridad.md, con el límite de intentos como mitigación.
 */
describe('enumeración de cuentas', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  /** Mediana en ms de varias requests iguales. */
  const medianMs = async (send: () => Promise<unknown>, runs = 7) => {
    const times: number[] = [];
    for (let i = 0; i < runs; i++) {
      const start = process.hrtime.bigint();
      await send();
      times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    return times.sort((a, b) => a - b)[Math.floor(runs / 2)];
  };

  it('login: misma respuesta y tiempo parecido para un email con cuenta y uno sin cuenta', async () => {
    await registerUser(app, 'existe@antojarte.example');
    const login = (email: string) =>
      request(server())
        .post('/auth/login')
        .send({ email, password: 'ClaveEquivocada1' });

    const existing = await login('existe@antojarte.example');
    const missing = await login('no-existe@antojarte.example');
    expect(existing.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(existing.body).toEqual(missing.body);

    const withAccount = await medianMs(() => login('existe@antojarte.example'));
    const without = await medianMs(() => login('no-existe@antojarte.example'));
    // Los dos comparan contra un hash bcrypt (uno falso si no hay cuenta): la diferencia es ruido.
    process.stdout.write(
      `enumeración login: con cuenta ${withAccount.toFixed(1)} ms, sin cuenta ${without.toFixed(1)} ms\n`,
    );
    expect(withAccount / without).toBeGreaterThan(0.5);
    expect(withAccount / without).toBeLessThan(2);
  });

  it('recuperación: misma respuesta y tiempo parecido exista o no la cuenta', async () => {
    await registerUser(app, 'existe@antojarte.example');
    const forgot = (email: string) =>
      request(server()).post('/auth/forgot-password').send({ email });

    const existing = await forgot('existe@antojarte.example');
    const missing = await forgot('no-existe@antojarte.example');
    expect(existing.status).toBe(200);
    expect(existing.body).toEqual(missing.body);

    const withAccount = await medianMs(() =>
      forgot('existe@antojarte.example'),
    );
    const without = await medianMs(() => forgot('no-existe@antojarte.example'));
    process.stdout.write(
      `enumeración recuperación: con cuenta ${withAccount.toFixed(1)} ms, sin cuenta ${without.toFixed(1)} ms\n`,
    );
    // La respuesta sale antes de buscar la cuenta: ambas son de pocos ms.
    expect(Math.abs(withAccount - without)).toBeLessThan(25);
  });

  it('registro: un email ya registrado responde 409 (lo revela, decisión documentada)', async () => {
    await registerUser(app, 'existe@antojarte.example');
    const res = await request(server())
      .post('/auth/register')
      .send({
        full_name: 'Otra Persona',
        email: 'existe@antojarte.example',
        password: 'ClaveSegura123',
      })
      .expect(409);
    // No dice nada más que eso: ni el nombre ni otros datos de la cuenta.
    expect(JSON.stringify(res.body)).not.toContain('Usuario de Prueba');
  });
});

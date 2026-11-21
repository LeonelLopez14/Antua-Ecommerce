import { resolve } from 'node:path';
import {
  assertProductionEnv,
  parseTrustProxy,
  parseLowStockThreshold,
  parseUploadsDir,
  parseCorsOrigins,
  parseJwtExpiresIn,
  parseJwtSecret,
  parsePaymentsConfig,
  parseShippingEtaDays,
  parseShippingFlatRate,
} from './env.validation';

describe('validación del entorno', () => {
  it('SHIPPING_FLAT_RATE acepta números y rechaza lo demás', () => {
    expect(parseShippingFlatRate('1500')).toBe(1500);
    expect(() => parseShippingFlatRate('abc')).toThrow('SHIPPING_FLAT_RATE');
    expect(() => parseShippingFlatRate(undefined)).toThrow(
      'SHIPPING_FLAT_RATE',
    );
  });

  it('CORS_ORIGINS nunca acepta el comodín', () => {
    expect(parseCorsOrigins('')).toEqual([]);
    expect(parseCorsOrigins('https://a.test, https://b.test')).toEqual([
      'https://a.test',
      'https://b.test',
    ]);
    expect(() => parseCorsOrigins('*')).toThrow('CORS_ORIGINS');
  });

  it('el JWT exige un secreto largo y siempre vence', () => {
    expect(() => parseJwtSecret('corto')).toThrow('JWT_SECRET');
    expect(parseJwtSecret('x'.repeat(32))).toHaveLength(32);
    expect(parseJwtExpiresIn('7d')).toBe('7d');
    expect(() => parseJwtExpiresIn(undefined)).toThrow('JWT_EXPIRES_IN');
    expect(() => parseJwtExpiresIn('nunca')).toThrow('JWT_EXPIRES_IN');
  });

  it('SHIPPING_ETA_DAYS es opcional, pero si se define tiene que ser válida', () => {
    expect(parseShippingEtaDays(undefined)).toBeNull();
    expect(parseShippingEtaDays('')).toBeNull();
    expect(parseShippingEtaDays('3')).toBe(3);
    for (const invalid of ['0', '2.5', 'tres', '61']) {
      expect(() => parseShippingEtaDays(invalid)).toThrow('SHIPPING_ETA_DAYS');
    }
  });

  describe('pagos', () => {
    const real = {
      MP_ACCESS_TOKEN: 'TEST-token',
      MP_WEBHOOK_SECRET: 'secreto',
      MP_PUBLIC_API_URL: 'https://api.ejemplo.test',
      MP_PUBLIC_FRONTEND_URL: 'https://tienda.ejemplo.test/',
    };

    it('sin credenciales quedan deshabilitados', () => {
      expect(parsePaymentsConfig({}).mode).toBe('disabled');
    });

    it('con credenciales completas se activan', () => {
      expect(parsePaymentsConfig(real)).toMatchObject({
        mode: 'mercadopago',
        currency: 'UYU',
        publicFrontendUrl: 'https://tienda.ejemplo.test',
      });
    });

    it('no arranca con credenciales incompletas', () => {
      expect(() => parsePaymentsConfig({ MP_ACCESS_TOKEN: 'x' })).toThrow(
        'juntas',
      );
    });

    it('exige URLs públicas HTTPS', () => {
      expect(() =>
        parsePaymentsConfig({
          ...real,
          MP_PUBLIC_API_URL: 'http://localhost:3000',
        }),
      ).toThrow('MP_PUBLIC_API_URL');
    });

    it('nunca se activa en producción', () => {
      expect(() =>
        parsePaymentsConfig({ ...real, NODE_ENV: 'production' }),
      ).toThrow('production');
      expect(parsePaymentsConfig({ NODE_ENV: 'production' }).mode).toBe(
        'disabled',
      );
    });

    it('la simulación no se combina con credenciales reales', () => {
      expect(() =>
        parsePaymentsConfig({ ...real, PAYMENTS_SIMULATED: 'true' }),
      ).toThrow('PAYMENTS_SIMULATED');
    });
  });

  describe('UPLOADS_DIR', () => {
    // Se compara con path.resolve para que el test pase igual en Linux
    // (/app/uploads) y en Windows (d:\app\uploads).
    it('por defecto es uploads/ junto a la API', () => {
      expect(parseUploadsDir(undefined, '/app')).toBe(
        resolve('/app', 'uploads'),
      );
      expect(parseUploadsDir('/var/antua/imagenes', '/app')).toBe(
        resolve('/var/antua/imagenes'),
      );
    });
    it('rechaza carpetas dentro de src/', () => {
      expect(() => parseUploadsDir('src', '/app')).toThrow('src/');
      expect(() => parseUploadsDir('./src/../src/img', '/app')).toThrow('src/');
    });
  });

  describe('TRUST_PROXY', () => {
    it('por defecto no confía en ningún proxy', () => {
      expect(parseTrustProxy(undefined)).toBe(false);
      expect(parseTrustProxy('false')).toBe(false);
    });
    it('acepta una cantidad de proxies o una lista de redes', () => {
      expect(parseTrustProxy('1')).toBe(1);
      expect(parseTrustProxy('loopback, 172.16.0.0/12')).toEqual([
        'loopback',
        '172.16.0.0/12',
      ]);
    });
    it('nunca acepta true ni valores raros', () => {
      for (const invalid of ['true', '0', '9', 'cualquiera', '1.2.3.4; rm']) {
        expect(() => parseTrustProxy(invalid)).toThrow('TRUST_PROXY');
      }
    });
  });

  describe('producción', () => {
    const prod = {
      NODE_ENV: 'production',
      DB_HOST: 'db',
      DB_PORT: '3306',
      DB_USERNAME: 'antua_app',
      DB_PASSWORD: 'f3a9c1d7e2b8a4c6d0e5f1a2',
      DB_DATABASE: 'antua_db',
      FRONTEND_URL: 'https://antojarte.lan',
      JWT_SECRET: 'q8V2mK9xL4pR7tY1wZ3nB6cF0hJ5sD8gA2eU4iO7',
    };

    it('acepta una configuración completa con secretos fuertes', () => {
      expect(() => assertProductionEnv(prod)).not.toThrow();
    });
    it('en desarrollo no aplica estas reglas', () => {
      expect(() =>
        assertProductionEnv({
          ...prod,
          NODE_ENV: 'development',
          DB_USERNAME: 'root',
        }),
      ).not.toThrow();
    });
    it('falla si falta una variable obligatoria', () => {
      expect(() => assertProductionEnv({ ...prod, DB_PASSWORD: '' })).toThrow(
        'DB_PASSWORD',
      );
      expect(() =>
        assertProductionEnv({ ...prod, FRONTEND_URL: undefined }),
      ).toThrow('FRONTEND_URL');
    });
    it('no se conecta como root', () => {
      expect(() =>
        assertProductionEnv({ ...prod, DB_USERNAME: 'root' }),
      ).toThrow('root');
    });
    it('rechaza secretos de ejemplo o débiles', () => {
      const examples = [
        'reemplazar_por_un_secreto_largo_y_aleatorio_de_al_menos_32_caracteres',
        'EJEMPLO-jwt-no-usar-en-produccion-0000000000000000',
        'a'.repeat(64),
        'corto',
      ];
      for (const JWT_SECRET of examples) {
        expect(() => assertProductionEnv({ ...prod, JWT_SECRET })).toThrow(
          'JWT_SECRET',
        );
      }
      for (const DB_PASSWORD of [
        'tu_password',
        '1234567890123456',
        'abababababababab',
      ]) {
        expect(() => assertProductionEnv({ ...prod, DB_PASSWORD })).toThrow(
          'DB_PASSWORD',
        );
      }
    });
    it('exige HTTPS en FRONTEND_URL y nada de SEED_ADMIN_PASSWORD', () => {
      expect(() =>
        assertProductionEnv({ ...prod, FRONTEND_URL: 'http://antojarte.lan' }),
      ).toThrow('HTTPS');
      expect(() =>
        assertProductionEnv({ ...prod, SEED_ADMIN_PASSWORD: 'Admin123456' }),
      ).toThrow('SEED_ADMIN_PASSWORD');
    });
  });

  describe('LOW_STOCK_THRESHOLD', () => {
    it('por defecto 5; acepta enteros de 0 a 10000', () => {
      expect(parseLowStockThreshold(undefined)).toBe(5);
      expect(parseLowStockThreshold('0')).toBe(0);
      expect(() => parseLowStockThreshold('-1')).toThrow();
      expect(() => parseLowStockThreshold('2.5')).toThrow();
    });
  });
});

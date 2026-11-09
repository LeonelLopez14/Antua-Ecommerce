import {
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
});

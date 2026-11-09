import {
  parseCorsOrigins,
  parseJwtExpiresIn,
  parseJwtSecret,
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
});

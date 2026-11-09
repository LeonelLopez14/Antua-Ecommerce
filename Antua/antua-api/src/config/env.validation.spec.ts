import { parseShippingEtaDays, parseShippingFlatRate } from './env.validation';

describe('validación del entorno', () => {
  it('SHIPPING_FLAT_RATE acepta números y rechaza lo demás', () => {
    expect(parseShippingFlatRate('1500')).toBe(1500);
    expect(() => parseShippingFlatRate('abc')).toThrow('SHIPPING_FLAT_RATE');
    expect(() => parseShippingFlatRate(undefined)).toThrow(
      'SHIPPING_FLAT_RATE',
    );
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

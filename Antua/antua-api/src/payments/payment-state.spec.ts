import {
  nextPaymentStatus,
  parseExternalReference,
  PaymentStatus,
  sameAmount,
} from './payment-state';

const { PENDING, PAID, FAILED, CANCELED, REFUNDED, PAID_AFTER_CANCEL } =
  PaymentStatus;

describe('transiciones de pago', () => {
  it.each([
    [PENDING, 'approved', PAID],
    [FAILED, 'approved', PAID],
    [PENDING, 'rejected', FAILED],
    [PENDING, 'cancelled', FAILED],
    [FAILED, 'in_process', PENDING],
    [PENDING, 'in_process', PENDING],
    [PAID, 'refunded', REFUNDED],
    [PAID, 'charged_back', REFUNDED],
    [CANCELED, 'approved', PAID_AFTER_CANCEL],
  ])('%s + %s → %s', (current, provider, expected) => {
    expect(nextPaymentStatus(current, provider)).toBe(expected);
  });

  it('un pedido pagado no vuelve atrás por un aviso viejo o por otro intento', () => {
    for (const provider of ['rejected', 'cancelled', 'pending', 'in_process']) {
      expect(nextPaymentStatus(PAID, provider)).toBe(PAID);
    }
  });

  it('un pedido sin pagar no puede quedar devuelto', () => {
    expect(nextPaymentStatus(PENDING, 'refunded')).toBe(PENDING);
  });

  it('compara montos en centavos', () => {
    expect(sameAmount(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameAmount(100, 100.01)).toBe(false);
  });

  it('solo acepta referencias propias', () => {
    expect(parseExternalReference('order-12')).toBe(12);
    expect(parseExternalReference('otra-cosa')).toBeNull();
    expect(parseExternalReference(undefined)).toBeNull();
  });
});

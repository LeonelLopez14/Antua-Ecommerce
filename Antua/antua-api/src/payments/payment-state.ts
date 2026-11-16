/** Estados de `orders.payment_status` (ver docs/payments-design.md del front). */
export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'canceled',
  REFUNDED: 'refunded',
  PAID_AFTER_CANCEL: 'paid_after_cancel',
} as const;

/** Pago cuyo monto o moneda no coinciden con el pedido: nunca lo marca como pagado. */
export const AMOUNT_MISMATCH = 'amount_mismatch';

const PAYABLE: string[] = [PaymentStatus.PENDING, PaymentStatus.FAILED];
export const isPayableStatus = (status: string): boolean =>
  PAYABLE.includes(status);

/**
 * Único lugar que decide cómo cambia el pago de un pedido.
 * Es una función pura, así que cada transición se prueba sin base de datos.
 */
export function nextPaymentStatus(
  current: string,
  providerStatus: string,
): string {
  switch (providerStatus) {
    case 'approved':
      if (current === PaymentStatus.CANCELED) {
        return PaymentStatus.PAID_AFTER_CANCEL;
      }
      return isPayableStatus(current) ? PaymentStatus.PAID : current;
    case 'rejected':
    case 'cancelled':
      return current === PaymentStatus.PENDING ? PaymentStatus.FAILED : current;
    case 'refunded':
    case 'charged_back':
      return current === PaymentStatus.PAID ? PaymentStatus.REFUNDED : current;
    default:
      // pending, in_process, authorized, in_mediation: nuevo intento en curso.
      return current === PaymentStatus.FAILED ? PaymentStatus.PENDING : current;
  }
}

export const sameAmount = (a: number, b: number): boolean =>
  Math.round(a * 100) === Math.round(b * 100);

const EXTERNAL_REFERENCE = /^order-(\d+)$/;

export const toExternalReference = (orderId: number): string =>
  `order-${orderId}`;

export function parseExternalReference(
  reference: string | undefined,
): number | null {
  const match = reference ? EXTERNAL_REFERENCE.exec(reference) : null;
  return match ? Number(match[1]) : null;
}

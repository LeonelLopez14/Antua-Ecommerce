import {
  CreatePreferenceInput,
  PaymentProvider,
  ProviderPayment,
} from './payment-provider';
import { toExternalReference } from './payment-state';

/**
 * Proveedor simulado (solo desarrollo y tests, sin internet). El estado va codificado en el id
 * del pago: 7 + dígito de estado + id del pedido. Ver scripts/simulate-mp-webhook.ts.
 */
export const SIMULATED_STATUSES = {
  approved: '1',
  pending: '2',
  rejected: '3',
  refunded: '4',
  mismatch: '9',
} as const;

export type SimulatedStatus = keyof typeof SIMULATED_STATUSES;

export const simulatedPaymentId = (
  orderId: number,
  status: SimulatedStatus,
): string => `7${SIMULATED_STATUSES[status]}${orderId}`;

export class SimulatedProvider implements PaymentProvider {
  private readonly checkouts = new Map<number, CreatePreferenceInput>();

  constructor(private readonly frontendUrl: string) {}

  createCheckout(input: CreatePreferenceInput): Promise<string> {
    this.checkouts.set(input.orderId, input);
    const reference = toExternalReference(input.orderId);
    const paymentId = simulatedPaymentId(input.orderId, 'pending');
    return Promise.resolve(
      `${this.frontendUrl}/pago/pendiente?payment_id=${paymentId}&status=pending&external_reference=${reference}`,
    );
  }

  getPayment(id: string): Promise<ProviderPayment> {
    const orderId = Number(id.slice(2));
    const checkout = this.checkouts.get(orderId);
    if (!/^7\d\d+$/.test(id) || !checkout) {
      return Promise.reject(new Error('Pago simulado desconocido.'));
    }
    const found = Object.entries(SIMULATED_STATUSES).find(
      ([, digit]) => digit === id[1],
    );
    const status = found?.[0] ?? 'pending';
    return Promise.resolve({
      id,
      status: status === 'mismatch' ? 'approved' : status,
      amount: status === 'mismatch' ? 1 : checkout.total,
      currency: checkout.currency,
      method: 'simulado',
      externalReference: toExternalReference(orderId),
    });
  }
}

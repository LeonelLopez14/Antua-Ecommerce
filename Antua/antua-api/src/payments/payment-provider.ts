export interface CreatePreferenceInput {
  orderId: number;
  /** Total calculado por el servidor. */
  total: number;
  currency: string;
  expiresAt: Date;
}

export interface ProviderPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  method: string | null;
  externalReference: string | undefined;
}

/** Lo que Payments necesita de un proveedor. Permite probar todo sin salir a internet. */
export interface PaymentProvider {
  /** Devuelve la URL a la que se redirige para pagar. */
  createCheckout(input: CreatePreferenceInput): Promise<string>;
  getPayment(id: string): Promise<ProviderPayment>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

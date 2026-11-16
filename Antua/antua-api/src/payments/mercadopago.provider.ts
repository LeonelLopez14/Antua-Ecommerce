import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import {
  CreatePreferenceInput,
  PaymentProvider,
  ProviderPayment,
} from './payment-provider';
import { toExternalReference } from './payment-state';

interface MercadoPagoSettings {
  accessToken: string;
  publicApiUrl: string;
  publicFrontendUrl: string;
}

/** Checkout Pro con el SDK oficial. Campos verificados en docs/payments-design.md. */
export class MercadoPagoProvider implements PaymentProvider {
  private readonly client: MercadoPagoConfig;

  constructor(private readonly settings: MercadoPagoSettings) {
    this.client = new MercadoPagoConfig({
      accessToken: settings.accessToken,
    });
  }

  async createCheckout({
    orderId,
    total,
    currency,
    expiresAt,
  }: CreatePreferenceInput): Promise<string> {
    const { publicApiUrl, publicFrontendUrl } = this.settings;
    const expiration = expiresAt.toISOString();

    const preference = await new Preference(this.client).create({
      body: {
        // Una sola línea con el total del pedido: incluye envío y descuento, y lo calcula el servidor.
        items: [
          {
            id: toExternalReference(orderId),
            title: `Pedido #${orderId} de Antua`,
            quantity: 1,
            unit_price: total,
            currency_id: currency,
          },
        ],
        external_reference: toExternalReference(orderId),
        back_urls: {
          success: `${publicFrontendUrl}/pago/exitoso`,
          pending: `${publicFrontendUrl}/pago/pendiente`,
          failure: `${publicFrontendUrl}/pago/fallido`,
        },
        auto_return: 'approved',
        notification_url: `${publicApiUrl}/payments/webhook`,
        expires: true,
        expiration_date_to: expiration,
        date_of_expiration: expiration,
      },
    });

    // Solo la URL de pruebas: este proyecto nunca debe llevar a un checkout real.
    if (!preference.sandbox_init_point) {
      throw new Error('Mercado Pago no devolvió la URL de pruebas.');
    }
    return preference.sandbox_init_point;
  }

  async getPayment(id: string): Promise<ProviderPayment> {
    const payment = await new Payment(this.client).get({ id });
    return {
      id: String(payment.id),
      status: payment.status ?? 'unknown',
      amount: Number(payment.transaction_amount),
      currency: payment.currency_id ?? '',
      method: payment.payment_method_id ?? null,
      externalReference: payment.external_reference,
    };
  }
}

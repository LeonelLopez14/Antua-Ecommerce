import { api } from './client'

const ORDER_TOKEN_HEADER = 'X-Order-Token'

/** `accessToken`: solo para invitados; con sesión, alcanza el JWT. */
const orderHeaders = (accessToken: string | null) => (accessToken ? { [ORDER_TOKEN_HEADER]: accessToken } : {})

/** GET /payments/config: si el pago online está disponible. */
export async function fetchPaymentsConfig(signal?: AbortSignal): Promise<{ enabled: boolean }> {
  const { data } = await api.get<{ enabled: boolean }>('/payments/config', { signal })
  return data
}

/** POST /orders/:id/payment: crea el checkout y devuelve la URL de pago. El monto lo define el servidor. */
export async function startPayment(orderId: number, accessToken: string | null): Promise<string> {
  const { data } = await api.post<{ redirectUrl: string }>(`/orders/${orderId}/payment`, null, { headers: orderHeaders(accessToken) })
  return data.redirectUrl
}

/** POST /orders/:id/payment/retry: nuevo intento para un pedido pendiente o rechazado. */
export async function retryPayment(orderId: number, accessToken: string | null): Promise<string> {
  const { data } = await api.post<{ redirectUrl: string }>(`/orders/${orderId}/payment/retry`, null, { headers: orderHeaders(accessToken) })
  return data.redirectUrl
}

export interface PaymentState {
  orderId: number
  paymentStatus: string
  orderStatus: string
  canPay: boolean
}

/** GET /orders/:id/payment: el estado según el servidor. Con `paymentId`, antes consulta al proveedor. */
export async function fetchPaymentState(orderId: number, accessToken: string | null, paymentId?: string, signal?: AbortSignal): Promise<PaymentState> {
  const { data } = await api.get<PaymentState>(`/orders/${orderId}/payment`, {
    signal,
    headers: orderHeaders(accessToken),
    params: paymentId ? { payment_id: paymentId } : undefined,
  })
  return data
}

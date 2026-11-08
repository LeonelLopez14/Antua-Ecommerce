import { api } from './client'
import { toNumber } from './products'
import type { ApiCreateOrderResponse, ApiOrder, ApiOrderItem, CreateOrderPayload, Order, OrderItem } from '../types/order'

const toOrderItem = (item: ApiOrderItem): OrderItem => ({
  id: item.id,
  productName: item.product_name_snapshot,
  unitPrice: toNumber(item.unit_price_snapshot),
  quantity: item.quantity,
  variantId: item.variant?.id ?? null,
  variantName: item.variant?.name ?? null,
})

function toOrder(order: ApiOrder, items: ApiOrderItem[] = order.items ?? []): Order {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.payment_status,
    guestEmail: order.guest_email,
    createdAt: order.created_at,
    shipping: {
      fullName: order.shipping_full_name,
      phone: order.shipping_phone,
      street: order.shipping_street,
      city: order.shipping_city,
      postalCode: order.shipping_postal_code,
    },
    couponCode: order.coupon?.code ?? null,
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discount_amount),
    shippingAmount: toNumber(order.shipping_amount),
    total: toNumber(order.total),
    items: items.map(toOrderItem),
  }
}

/**
 * POST /orders (invitado con X-Guest-Token o usuario con JWT). El backend recalcula todo,
 * usa el cupón del carrito y vacía el carrito. Una segunda llamada responde 400
 * "El carrito está vacío", así que no se pueden duplicar pedidos.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.post<ApiCreateOrderResponse>('/orders', payload)
  return toOrder(data.order, data.items)
}

/** GET /orders (JWT): pedidos del usuario, el más nuevo primero. El backend no pagina. */
export async function fetchOrders(signal?: AbortSignal): Promise<Order[]> {
  const { data } = await api.get<ApiOrder[]>('/orders', { signal })
  return data.map((order) => toOrder(order))
}

/** GET /orders/:id (JWT): 404 si no existe o es de otro usuario. */
export async function fetchOrder(id: number, signal?: AbortSignal): Promise<Order> {
  const { data } = await api.get<ApiOrder>(`/orders/${id}`, { signal })
  return toOrder(data)
}

/** GET /orders/guest/:id?email= (sin sesión): 404 si el email no coincide. */
export async function fetchGuestOrder(id: number, email: string, signal?: AbortSignal): Promise<Order> {
  const { data } = await api.get<ApiOrder>(`/orders/guest/${id}`, { params: { email }, signal })
  return toOrder(data)
}

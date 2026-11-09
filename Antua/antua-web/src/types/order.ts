import type { ApiDecimal } from './product'

/** Estados de antua-api (orders/entities/order.entity.ts → OrderStatus). */
export type OrderStatus = 'pending' | 'preparing' | 'shipped' | 'delivered' | 'canceled'

/**
 * Pedido tal cual lo devuelve antua-api. Los DECIMAL llegan como string en las lecturas
 * y como number recién creados (POST /orders): se normalizan en `api/orders.ts`.
 */
export interface ApiOrder {
  id: number
  guest_email: string | null
  status: OrderStatus | string
  payment_status: string
  shipping_full_name: string
  shipping_phone: string
  shipping_street: string
  shipping_city: string
  shipping_postal_code: string
  subtotal: ApiDecimal
  discount_amount: ApiDecimal
  shipping_amount: ApiDecimal
  total: ApiDecimal
  created_at: string
  coupon: { code: string } | null
  items?: ApiOrderItem[]
}

export interface ApiOrderItem {
  id: number
  product_name_snapshot: string
  unit_price_snapshot: ApiDecimal
  quantity: number
  variant: { id: number; name: string } | null
}

/** POST /orders responde `{ order, items, accessToken }` (la orden sin ítems y los ítems aparte). */
export interface ApiCreateOrderResponse {
  order: ApiOrder
  items: ApiOrderItem[]
  /** Solo invitados: prueba de que el pedido es suyo. Se entrega una única vez. */
  accessToken: string | null
}

/** Body de POST /orders (orders/dto/create-order.dto.ts). `guest_email` es obligatorio sin JWT. */
export interface CreateOrderPayload {
  guest_email?: string
  shipping_full_name: string
  shipping_phone: string
  shipping_street: string
  shipping_city: string
  shipping_postal_code: string
}

// ---- Modelo de la UI (montos ya normalizados) ----

export interface OrderItem {
  id: number
  /** Nombre al momento de la compra. */
  productName: string
  /** Precio unitario al momento de la compra. */
  unitPrice: number
  quantity: number
  variantId: number | null
  variantName: string | null
}

export interface Order {
  id: number
  status: OrderStatus | string
  paymentStatus: string
  guestEmail: string | null
  createdAt: string
  shipping: {
    fullName: string
    phone: string
    street: string
    city: string
    postalCode: string
  }
  couponCode: string | null
  /** Totales tal cual los guardó el backend. */
  subtotal: number
  discount: number
  shippingAmount: number
  total: number
  items: OrderItem[]
}

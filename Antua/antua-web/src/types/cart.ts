import type { ApiDecimal, ApiProduct, ApiProductVariant } from './product'

/**
 * Respuestas de /cart: siempre `{ cart, summary }`, con los ítems trayendo
 * `variant.product.images` (ver docs/backend-cart-fix.md). `api/cart.ts` valida la forma
 * en runtime por si el backend cambia.
 */
export interface ApiCoupon {
  id: number
  code: string
  discount_type: 'percentage' | 'fixed' | string
  discount_value: ApiDecimal
  min_order_amount: ApiDecimal | null
}

export interface ApiCartItem {
  id: number
  quantity: number
  unit_price_snapshot: ApiDecimal
  variant: ApiProductVariant & { product?: Pick<ApiProduct, 'id' | 'name' | 'slug' | 'images'> }
}

export interface ApiCart {
  id: number
  guest_token: string | null
  coupon: ApiCoupon | null
  items?: ApiCartItem[]
}

export interface ApiCartSummary {
  subtotal: number
  discount: number
  /** null = SHIPPING_FLAT_RATE no configurado en el backend. */
  shipping?: number | null
  total: number
  /** Plazo estimado de entrega, en días. null = no configurado. */
  shippingEtaDays?: number | null
}

export interface ApiCartResponse {
  cart: ApiCart
  summary: ApiCartSummary
}

// ---- Modelo de la UI ----

export interface CartItem {
  id: number
  quantity: number
  unitPrice: number
  variant: { id: number; name: string; stock: number }
  /** null si el backend no incluye variant.product (versiones anteriores al arreglo B3). */
  product: { name: string; slug: string; imageUrl: string | null } | null
}

/** Totales tal cual los calcula el backend. Nunca se recalculan en el cliente. */
export interface CartSummary {
  subtotal: number
  discount: number
  /** null: el envío todavía no está definido y se calcula en el checkout. */
  shipping: number | null
  total: number
  /** Plazo estimado de entrega, en días. null: el backend no informa un plazo. */
  shippingEtaDays: number | null
}

/** Algo que el backend cambió en el carrito sin que se lo pidieran (por ahora, cupón retirado). */
export interface CartWarning {
  code: 'COUPON_REMOVED_MIN_NOT_MET'
  couponCode: string
  minAmount: number
}

export interface Cart {
  id: number
  couponCode: string | null
  items: CartItem[]
}

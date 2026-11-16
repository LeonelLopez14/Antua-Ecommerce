import { api } from './client'
import { toNumber } from './products'
import type { ApiCart, ApiCartItem, ApiCartSummary, Cart, CartItem, CartSummary, CartWarning } from '../types/cart'

export interface CartSnapshot {
  cart: Cart
  summary: CartSummary
  /** Avisos de esta respuesta. Por ejemplo, un cupón retirado por no llegar al mínimo. */
  warnings: CartWarning[]
}

/** La respuesta no tiene la forma `{ cart: { items }, summary }` que necesita el drawer. */
export class CartContractError extends Error {
  constructor(endpoint: string) {
    super(`Respuesta de ${endpoint} sin items o sin summary`)
    this.name = 'CartContractError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function isSummary(value: unknown): value is ApiCartSummary {
  return (
    isRecord(value) &&
    typeof value.subtotal === 'number' &&
    typeof value.discount === 'number' &&
    typeof value.total === 'number'
  )
}

function isCartWithItems(value: unknown): value is ApiCart & { items: ApiCartItem[] } {
  return isRecord(value) && typeof value.id === 'number' && Array.isArray(value.items)
}

function isCartWarning(value: unknown): value is CartWarning {
  return (
    isRecord(value) &&
    value.code === 'COUPON_REMOVED_MIN_NOT_MET' &&
    typeof value.couponCode === 'string' &&
    typeof value.minAmount === 'number'
  )
}

function toCartItem(item: ApiCartItem): CartItem {
  const product = item.variant.product
  const [firstImage] = [...(product?.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return {
    id: item.id,
    quantity: item.quantity,
    unitPrice: toNumber(item.unit_price_snapshot),
    variant: { id: item.variant.id, name: item.variant.name, stock: item.variant.stock },
    product: product ? { name: product.name, slug: product.slug, imageUrl: firstImage?.url ?? null } : null,
  }
}

/**
 * Valida y normaliza `{ cart, summary }`. Si el backend devuelve otra forma,
 * tira CartContractError en vez de inventar datos o calcular totales en el cliente.
 */
function normalize(data: unknown, endpoint: string): CartSnapshot {
  if (!isRecord(data) || !isCartWithItems(data.cart) || !isSummary(data.summary)) {
    // Diagnóstico solo en desarrollo: en producción el usuario ve un error amable con reintento.
    if (import.meta.env.DEV) console.warn(`[cart] ${endpoint} devolvió una forma inesperada. Ver docs/backend-cart-fix.md.`, data)
    throw new CartContractError(endpoint)
  }
  const { cart, summary } = data
  return {
    cart: { id: cart.id, couponCode: cart.coupon?.code ?? null, items: cart.items.map(toCartItem) },
    summary: {
      subtotal: summary.subtotal,
      discount: summary.discount,
      shipping: typeof summary.shipping === 'number' ? summary.shipping : null,
      total: summary.total,
      shippingEtaDays: typeof summary.shippingEtaDays === 'number' ? summary.shippingEtaDays : null,
    },
    warnings: Array.isArray(data.warnings) ? data.warnings.filter(isCartWarning) : [],
  }
}

export async function fetchCart(): Promise<CartSnapshot> {
  const { data } = await api.get<unknown>('/cart')
  return normalize(data, 'GET /cart')
}

export async function addCartItem(variantId: number, quantity: number): Promise<CartSnapshot> {
  const { data } = await api.post<unknown>('/cart/items', { variantId, quantity })
  return normalize(data, 'POST /cart/items')
}

export async function updateCartItem(itemId: number, quantity: number): Promise<CartSnapshot> {
  const { data } = await api.patch<unknown>(`/cart/items/${itemId}`, { quantity })
  return normalize(data, 'PATCH /cart/items/:id')
}

export async function removeCartItem(itemId: number): Promise<CartSnapshot> {
  const { data } = await api.delete<unknown>(`/cart/items/${itemId}`)
  return normalize(data, 'DELETE /cart/items/:id')
}

export async function applyCoupon(couponCode: string): Promise<CartSnapshot> {
  const { data } = await api.post<unknown>('/cart/coupon', { couponCode })
  return normalize(data, 'POST /cart/coupon')
}

/**
 * POST /cart/merge (requiere JWT): pasa los ítems del carrito de invitado al del usuario
 * y borra el de invitado. El token de invitado va explícito porque, con sesión,
 * el interceptor solo manda Authorization.
 */
export async function mergeGuestCart(guestToken: string): Promise<CartSnapshot> {
  const { data } = await api.post<unknown>('/cart/merge', null, { headers: { 'X-Guest-Token': guestToken } })
  return normalize(data, 'POST /cart/merge')
}

export async function removeCoupon(): Promise<CartSnapshot> {
  const { data } = await api.delete<unknown>('/cart/coupon')
  return normalize(data, 'DELETE /cart/coupon')
}

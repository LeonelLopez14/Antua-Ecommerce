/** Tipos de las rutas /admin de antua-api (src/admin). Los montos ya llegan como number salvo donde se indica. */

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** DELETE de producto, variante o cupón: si tiene historial, se desactiva y `message` lo explica. */
export interface RemovalResult {
  deleted: boolean
  deactivated: boolean
  message: string
}

export interface AdminTagRef {
  id: number
  name: string
  slug: string
}

export interface AdminVariant {
  id: number
  name: string
  price: number
  stock: number
  sku: string
  is_active: boolean
  hasHistory?: boolean
}

export interface AdminProductListItem {
  id: number
  name: string
  slug: string
  is_active: boolean
  image: string | null
  tags: AdminTagRef[]
  variants: AdminVariant[]
  lowStock: boolean
}

export interface AdminImage {
  id: number
  url: string
  sort_order: number
  is_primary: boolean
}

export interface AdminProduct {
  id: number
  name: string
  slug: string
  description: string
  ingredients: string
  allergens: string
  nutrition_info: string | null
  is_active: boolean
  tags: AdminTagRef[]
  variants: AdminVariant[]
  images: AdminImage[]
  hasHistory: boolean
  lowStockThreshold: number
}

export interface ProductInput {
  name: string
  slug?: string
  description: string
  ingredients: string
  allergens: string
  nutrition_info: string | null
  is_active?: boolean
  tagIds: number[]
}

export const VARIANT_NAMES = ['x1', 'x6', 'x12'] as const
export type VariantName = (typeof VARIANT_NAMES)[number]
export type StockReason = 'restock' | 'shrinkage' | 'adjustment'

export interface AdminTag extends AdminTagRef {
  is_active: boolean
  productCount: number
  protected: boolean
}

export type CouponStatus = 'active' | 'inactive' | 'scheduled' | 'expired' | 'exhausted'

export interface AdminCoupon {
  id: number
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number | null
  usage_limit: number | null
  times_used: number
  valid_from: string
  valid_until: string
  is_active: boolean
  status: CouponStatus
}

export type CouponInput = Omit<AdminCoupon, 'id' | 'times_used' | 'status'>

export type OrderStatusValue = 'pending' | 'preparing' | 'shipped' | 'delivered' | 'canceled'

export interface AdminOrderListItem {
  id: number
  created_at: string
  status: OrderStatusValue
  payment_status: string
  total: number
  customer: string
  email: string | null
  isGuest: boolean
  units: number
}

export interface AdminOrder {
  id: number
  created_at: string
  status: OrderStatusValue
  allowedTransitions: OrderStatusValue[]
  payment: {
    status: string
    expires_at: string | null
    attempts: {
      id: number
      method: string
      status: string
      amount: number | null
      currency: string | null
      created_at: string
      paid_at: string | null
    }[]
  }
  contact: { email: string | null; isGuest: boolean; userId: number | null; name: string; phone: string }
  shipping: { full_name: string; street: string; city: string; postal_code: string; eta_days: number | null }
  items: { id: number; product_name: string; variant: { id: number; name: string; sku: string } | null; unit_price: number; quantity: number }[]
  coupon: { id: number; code: string } | null
  totals: { subtotal: number; discount: number; shipping: number; total: number }
  internal_note: string | null
  history: { id: number; from: string; to: string; created_at: string; by: { id: number; name: string } | null }[]
  /** Solo después de cancelar un pedido pagado: hay que devolver el pago a mano. */
  notice?: string
}

export interface AdminStats {
  timeZone: string
  today: string
  periods: Record<'today' | 'last7Days' | 'last30Days', { orders: number; revenue: number }>
  queues: { pendingPayment: number; toPrepare: number; preparing: number }
  daily: { day: string; orders: number; revenue: number }[]
  topProducts: { productId: number; name: string; units: number; revenue: number }[]
  lowStock: { threshold: number; variants: { variantId: number; productId: number; product: string; name: string; stock: number }[] }
  reviews: { last7Days: number; latest: { id: number; rating: number; product: string; created_at: string; is_hidden: boolean }[] }
}

export interface AdminReview {
  id: number
  rating: number
  comment: string | null
  is_hidden: boolean
  created_at: string
  product: { id: number; name: string; slug: string }
  author: { id: number; name: string }
}

export interface AdminUserRow {
  id: number
  full_name: string
  email: string
  role: 'customer' | 'admin'
  created_at: string
  orders: number
}

export interface AuditEntry {
  id: number
  action: string
  entity: string
  entity_id: number | null
  changes: Record<string, unknown> | null
  created_at: string
  admin: { id: number; full_name: string } | null
}

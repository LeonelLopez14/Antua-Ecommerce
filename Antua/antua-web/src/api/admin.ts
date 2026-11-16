import { api, imageUrl } from './client'
import type {
  AdminCoupon,
  AdminOrder,
  AdminOrderListItem,
  AdminProduct,
  AdminProductListItem,
  AdminReview,
  AdminStats,
  AdminTag,
  AdminUserRow,
  AuditEntry,
  CouponInput,
  OrderStatusValue,
  Page,
  ProductInput,
  RemovalResult,
  StockReason,
  VariantName,
} from '../types/admin'

/**
 * Rutas /admin de antua-api (src/admin). Todas exigen JWT de un usuario con rol admin:
 * sin sesión responden 401 y con rol customer 403. El front solo esconde el panel; la
 * seguridad real está en el backend (AdminAccessGuard).
 */

type Query = Record<string, string | number | boolean | undefined>

/** Quita los parámetros vacíos para que la URL de la API quede limpia. */
const clean = (query: Query): Query =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

const toNumber = (value: number | string): number => (typeof value === 'number' ? value : Number.parseFloat(value))


const normalizeProduct = (product: AdminProduct): AdminProduct => ({
  ...product,
  variants: product.variants.map((variant) => ({ ...variant, price: toNumber(variant.price) })),
  images: product.images.map((image) => ({ ...image, url: imageUrl(image.url) })),
})

// ---------- Resumen ----------

/** GET /admin/stats: todo agregado en el servidor, con días de America/Montevideo. */
export async function fetchStats(signal?: AbortSignal): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats', { signal })
  return data
}

// ---------- Productos ----------

/** GET /admin/products: ?q, status, tag, lowStock, sort (name|id|stock), dir, page, limit (máx. 50). */
export async function fetchAdminProducts(query: Query, signal?: AbortSignal) {
  const { data } = await api.get<Page<AdminProductListItem> & { lowStockThreshold: number }>('/admin/products', {
    params: clean(query),
    signal,
  })
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      image: item.image ? imageUrl(item.image) : null,
      variants: item.variants.map((variant) => ({ ...variant, price: toNumber(variant.price) })),
    })),
  }
}

export async function fetchAdminProduct(id: number, signal?: AbortSignal): Promise<AdminProduct> {
  const { data } = await api.get<AdminProduct>(`/admin/products/${id}`, { signal })
  return normalizeProduct(data)
}

/** POST /admin/products. 409 si el slug elegido ya existe; sin slug, lo genera. */
export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const { data } = await api.post<AdminProduct>('/admin/products', input)
  return normalizeProduct(data)
}

/** PATCH /admin/products/:id. 409 si se activa sin variantes activas o el slug está tomado. */
export async function updateProduct(id: number, input: Partial<ProductInput>): Promise<AdminProduct> {
  const { data } = await api.patch<AdminProduct>(`/admin/products/${id}`, input)
  return normalizeProduct(data)
}

/** DELETE /admin/products/:id: con pedidos o carritos, se desactiva en vez de borrarse. */
export async function removeProduct(id: number): Promise<RemovalResult> {
  const { data } = await api.delete<RemovalResult>(`/admin/products/${id}`)
  return data
}

export async function addVariant(
  productId: number,
  input: { name: VariantName; price: number; stock: number; sku: string },
): Promise<AdminProduct> {
  const { data } = await api.post<AdminProduct>(`/admin/products/${productId}/variants`, input)
  return normalizeProduct(data)
}

export async function updateVariant(
  productId: number,
  variantId: number,
  input: { price?: number; sku?: string; is_active?: boolean },
): Promise<AdminProduct> {
  const { data } = await api.patch<AdminProduct>(`/admin/products/${productId}/variants/${variantId}`, input)
  return normalizeProduct(data)
}

export async function removeVariant(productId: number, variantId: number): Promise<RemovalResult> {
  const { data } = await api.delete<RemovalResult>(`/admin/products/${productId}/variants/${variantId}`)
  return data
}

/** POST …/stock: restock suma, shrinkage resta (409 si deja negativo), adjustment fija el stock contado. */
export async function moveStock(
  productId: number,
  variantId: number,
  input: { reason: StockReason; quantity: number; note?: string },
): Promise<AdminProduct> {
  const { data } = await api.post<AdminProduct>(`/admin/products/${productId}/variants/${variantId}/stock`, input)
  return normalizeProduct(data)
}

/** multipart con `file`: JPEG, PNG o WebP de hasta 2 MB (el servidor revisa el contenido real). */
export async function uploadImage(productId: number, file: File): Promise<AdminProduct> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<AdminProduct>(`/admin/products/${productId}/images`, form, { timeout: 30_000 })
  return normalizeProduct(data)
}

export async function reorderImages(productId: number, imageIds: number[]): Promise<AdminProduct> {
  const { data } = await api.patch<AdminProduct>(`/admin/products/${productId}/images/order`, { imageIds })
  return normalizeProduct(data)
}

export async function setPrimaryImage(productId: number, imageId: number): Promise<AdminProduct> {
  const { data } = await api.patch<AdminProduct>(`/admin/products/${productId}/images/${imageId}/primary`)
  return normalizeProduct(data)
}

export async function removeImage(productId: number, imageId: number): Promise<AdminProduct> {
  const { data } = await api.delete<AdminProduct>(`/admin/products/${productId}/images/${imageId}`)
  return normalizeProduct(data)
}

// ---------- Tags ----------

export async function fetchAdminTags(signal?: AbortSignal): Promise<AdminTag[]> {
  const { data } = await api.get<AdminTag[]>('/admin/tags', { signal })
  return data
}

export async function createTag(input: { name: string; slug?: string }): Promise<AdminTag> {
  const { data } = await api.post<AdminTag>('/admin/tags', input)
  return data
}

/** 409 si se cambia el slug de un tag de la Home. */
export async function updateTag(id: number, input: { name?: string; slug?: string; is_active?: boolean }): Promise<AdminTag> {
  const { data } = await api.patch<AdminTag>(`/admin/tags/${id}`, input)
  return data
}

// ---------- Cupones ----------

export async function fetchAdminCoupons(query: Query, signal?: AbortSignal): Promise<Page<AdminCoupon>> {
  const { data } = await api.get<Page<AdminCoupon>>('/admin/coupons', { params: clean(query), signal })
  return data
}

export async function fetchAdminCoupon(id: number, signal?: AbortSignal): Promise<AdminCoupon> {
  const { data } = await api.get<AdminCoupon>(`/admin/coupons/${id}`, { signal })
  return data
}

export async function createCoupon(input: CouponInput): Promise<AdminCoupon> {
  const { data } = await api.post<AdminCoupon>('/admin/coupons', input)
  return data
}

export async function updateCoupon(id: number, input: Partial<CouponInput>): Promise<AdminCoupon> {
  const { data } = await api.patch<AdminCoupon>(`/admin/coupons/${id}`, input)
  return data
}

/** Un cupón ya usado se desactiva en vez de borrarse. */
export async function removeCoupon(id: number): Promise<RemovalResult> {
  const { data } = await api.delete<RemovalResult>(`/admin/coupons/${id}`)
  return data
}

// ---------- Pedidos ----------

export async function fetchAdminOrders(query: Query, signal?: AbortSignal): Promise<Page<AdminOrderListItem>> {
  const { data } = await api.get<Page<AdminOrderListItem>>('/admin/orders', { params: clean(query), signal })
  return data
}

export async function fetchAdminOrder(id: number, signal?: AbortSignal): Promise<AdminOrder> {
  const { data } = await api.get<AdminOrder>(`/admin/orders/${id}`, { signal })
  return data
}

/** 409 INVALID_TRANSITION con el motivo si la transición no vale (ej.: preparar sin pago). */
export async function changeOrderStatus(id: number, status: OrderStatusValue): Promise<AdminOrder> {
  const { data } = await api.patch<AdminOrder>(`/admin/orders/${id}/status`, { status })
  return data
}

export async function saveOrderNote(id: number, note: string): Promise<AdminOrder> {
  const { data } = await api.patch<AdminOrder>(`/admin/orders/${id}/note`, { note })
  return data
}

// ---------- Reseñas, usuarios y auditoría ----------

export async function fetchAdminReviews(query: Query, signal?: AbortSignal): Promise<Page<AdminReview>> {
  const { data } = await api.get<Page<AdminReview>>('/admin/reviews', { params: clean(query), signal })
  return data
}

export async function setReviewHidden(id: number, hidden: boolean): Promise<void> {
  await api.patch(`/admin/reviews/${id}`, { is_hidden: hidden })
}

export async function removeReview(id: number): Promise<void> {
  await api.delete(`/admin/reviews/${id}`)
}

export async function fetchAdminUsers(query: Query, signal?: AbortSignal): Promise<Page<AdminUserRow>> {
  const { data } = await api.get<Page<AdminUserRow>>('/admin/users', { params: clean(query), signal })
  return data
}

export async function fetchAudit(query: Query, signal?: AbortSignal): Promise<Page<AuditEntry>> {
  const { data } = await api.get<Page<AuditEntry>>('/admin/audit', { params: clean(query), signal })
  return data
}

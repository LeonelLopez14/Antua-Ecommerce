import { api } from './client'
import type { ApiDecimal, ApiProduct, ApiReview, ApiTag, Product, Review, Tag } from '../types/product'
import { toProductFilterParams, type ShopFacets, type ShopQuery, type ShopResult } from '../lib/shopQuery'

export const toNumber = (value: ApiDecimal): number =>
  typeof value === 'number' ? value : Number.parseFloat(value)

const toTag = (tag: ApiTag): Tag => ({ id: tag.id, name: tag.name, slug: tag.slug })

function toProduct(product: ApiProduct): Product {
  const variants = product.variants
    .filter((v) => v.is_active)
    .map((v) => ({ id: v.id, name: v.name, price: toNumber(v.price), stock: v.stock, sku: v.sku }))
    .sort((a, b) => a.price - b.price)
  const basePrice = toNumber(product.base_price)
  const prices = [basePrice, ...variants.map((v) => v.price)].filter((p) => Number.isFinite(p) && p > 0)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    ingredients: product.ingredients,
    allergens: product.allergens,
    basePrice,
    isActive: product.is_active,
    fromPrice: prices.length > 0 ? Math.min(...prices) : 0,
    variants,
    images: [...product.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ id: i.id, url: i.url })),
    tags: product.productTags.map((pt) => toTag(pt.tag)),
  }
}

/** GET /products sin parámetros: todos los productos activos (Home y búsqueda por variante). */
export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const { data } = await api.get<ApiProduct[]>('/products', { signal })
  return data.map(toProduct)
}

interface ApiProductPage {
  items: ApiProduct[]
  total: number
  page: number
  totalPages: number
  facets: ShopFacets
}

/** GET /products con filtros, orden y paginación (todo se resuelve en el backend). */
export async function fetchProductPage(query: ShopQuery, signal?: AbortSignal): Promise<ShopResult> {
  const { data } = await api.get<ApiProductPage>('/products', { params: toProductFilterParams(query), signal })
  return { items: data.items.map(toProduct), total: data.total, page: data.page, totalPages: data.totalPages, facets: data.facets }
}

export async function fetchProduct(slug: string, signal?: AbortSignal): Promise<Product> {
  const { data } = await api.get<ApiProduct>(`/products/${encodeURIComponent(slug)}`, { signal })
  return toProduct(data)
}

export async function fetchTags(signal?: AbortSignal): Promise<Tag[]> {
  const { data } = await api.get<ApiTag[]>('/tags', { signal })
  return data.map(toTag)
}

/** El backend incluye el usuario completo (con email); acá solo se conserva el nombre. */
export async function fetchReviews(slug: string, signal?: AbortSignal): Promise<Review[]> {
  const { data } = await api.get<ApiReview[]>(`/products/${encodeURIComponent(slug)}/reviews`, { signal })
  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    authorName: r.user?.full_name ?? null,
    authorId: r.user?.id ?? null,
  }))
}

/**
 * POST /products/:slug/reviews (JWT) con `{ rating, comment? }` (create-review.dto.ts).
 * 403 si no hay un pedido entregado con este producto; 409 si ya lo reseñaste.
 */
export async function postReview(slug: string, rating: number, comment: string): Promise<void> {
  await api.post(`/products/${encodeURIComponent(slug)}/reviews`, comment ? { rating, comment } : { rating })
}

/** PATCH /products/:slug/reviews/:id (JWT): solo la reseña propia; 404 para cualquier otra. */
export async function updateReview(slug: string, id: number, rating: number, comment: string): Promise<void> {
  await api.patch(`/products/${encodeURIComponent(slug)}/reviews/${id}`, { rating, comment })
}

/** DELETE /products/:slug/reviews/:id (JWT): solo la reseña propia. */
export async function deleteReview(slug: string, id: number): Promise<void> {
  await api.delete(`/products/${encodeURIComponent(slug)}/reviews/${id}`)
}

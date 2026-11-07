import { api } from './client'
import type { ApiDecimal, ApiProduct, ApiReview, ApiTag, Product, Review, Tag } from '../types/product'

export const toNumber = (value: ApiDecimal): number =>
  typeof value === 'number' ? value : Number.parseFloat(value)

const toTag = (tag: ApiTag): Tag => ({ id: tag.id, name: tag.name, slug: tag.slug })

export function toProduct(product: ApiProduct): Product {
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

/**
 * GET /products devuelve todos los productos activos, sin filtros, orden ni paginación
 * (product-filter.dto.ts está vacío). Filtrar y paginar se hace en `lib/shopQuery.ts`;
 * cuando el backend acepte query params, solo cambia esta función.
 */
export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const { data } = await api.get<ApiProduct[]>('/products', { signal })
  return data.map(toProduct)
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
  }))
}

/**
 * Respuestas de antua-api para productos.
 * TypeORM serializa los DECIMAL de MySQL como string: los precios admiten ambos tipos
 * y se normalizan a number en `api/products.ts`.
 */
export type ApiDecimal = number | string

export interface ApiTag {
  id: number
  name: string
  slug: string
}

export interface ApiProductTag {
  id: number
  tag: ApiTag
}

export interface ApiProductVariant {
  id: number
  /** Ej.: "x1", "x6", "x12". */
  name: string
  price: ApiDecimal
  stock: number
  is_active: boolean
  sku: string
}

export interface ApiProductImage {
  id: number
  url: string
  sort_order: number
}

/** GET /products/:slug incluye `reviews` (sin usuario). GET /products no las incluye. */
export interface ApiProduct {
  id: number
  name: string
  slug: string
  ingredients: string
  allergens: string
  description: string
  base_price: ApiDecimal
  is_active: boolean
  variants: ApiProductVariant[]
  images: ApiProductImage[]
  productTags: ApiProductTag[]
  reviews?: ApiReviewBase[]
}

export interface ApiReviewBase {
  id: number
  comment: string | null
  rating: number
  created_at: string
}

/** GET /products/:slug/reviews: incluye el usuario (solo se usa `full_name`). */
export interface ApiReview extends ApiReviewBase {
  user: { id: number; full_name: string } | null
}

// ---- Modelos que consume la UI (números ya normalizados) ----

export interface Tag {
  id: number
  name: string
  slug: string
}

export interface ProductVariant {
  id: number
  name: string
  price: number
  stock: number
  sku: string
}

export interface ProductImage {
  id: number
  url: string
}

export interface Product {
  id: number
  slug: string
  name: string
  description: string
  ingredients: string
  allergens: string
  basePrice: number
  /** GET /products/:slug no filtra inactivos: la ficha los trata como 404. */
  isActive: boolean
  /** Precio "desde": el menor entre el base y las variantes activas. */
  fromPrice: number
  /** Solo variantes activas, ordenadas por precio. */
  variants: ProductVariant[]
  /** Ordenadas por sort_order. */
  images: ProductImage[]
  tags: Tag[]
}

export interface Review {
  id: number
  rating: number
  comment: string | null
  createdAt: string
  authorName: string | null
}

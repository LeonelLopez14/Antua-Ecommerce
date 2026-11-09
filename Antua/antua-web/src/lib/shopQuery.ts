import type { Product } from '../types/product'

export const SORT_OPTIONS = [
  { value: 'recomendadas', label: 'Recomendadas' },
  { value: 'precio-asc', label: 'Menor precio' },
  { value: 'precio-desc', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['value']

const DEFAULT_SORT: SortKey = 'recomendadas'
export const PAGE_SIZE = 9

/** Estado de la Tienda. Vive en la URL para poder compartirlo y volver atrás. */
export interface ShopQuery {
  /** Slugs de tags (las categorías del backend son tags). */
  categories: string[]
  minPrice: number | null
  maxPrice: number | null
  sort: SortKey
  /** 1-based. */
  page: number
}

/** Nombres de los query params: ?categoria=veganas&categoria=sin-gluten&min=2000&max=3000&orden=precio-asc&pagina=2 */
const PARAM = {
  category: 'categoria',
  min: 'min',
  max: 'max',
  sort: 'orden',
  page: 'pagina',
} as const

const isSortKey = (value: string | null): value is SortKey => SORT_OPTIONS.some((o) => o.value === value)

function parsePrice(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

/** Lee la URL de forma tolerante: un parámetro inválido se ignora en vez de romper la página. */
export function parseShopQuery(params: URLSearchParams): ShopQuery {
  const sort = params.get(PARAM.sort)
  const page = Number(params.get(PARAM.page))
  return {
    categories: [...new Set(params.getAll(PARAM.category).filter(Boolean))],
    minPrice: parsePrice(params.get(PARAM.min)),
    maxPrice: parsePrice(params.get(PARAM.max)),
    sort: isSortKey(sort) ? sort : DEFAULT_SORT,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Escribe solo lo que no es valor por defecto, para que las URLs queden cortas. */
export function toSearchParams(query: ShopQuery): URLSearchParams {
  const params = new URLSearchParams()
  query.categories.forEach((slug) => params.append(PARAM.category, slug))
  if (query.minPrice !== null) params.set(PARAM.min, String(query.minPrice))
  if (query.maxPrice !== null) params.set(PARAM.max, String(query.maxPrice))
  if (query.sort !== DEFAULT_SORT) params.set(PARAM.sort, query.sort)
  if (query.page > 1) params.set(PARAM.page, String(query.page))
  return params
}

export const hasActiveFilters = (query: ShopQuery): boolean =>
  query.categories.length > 0 || query.minPrice !== null || query.maxPrice !== null

/** Facetas de GET /products: describen todo el catálogo activo, aunque haya filtros aplicados. */
export interface ShopFacets {
  tagCounts: Record<string, number>
  priceMin: number | null
  priceMax: number | null
}

export interface ShopResult {
  items: Product[]
  total: number
  totalPages: number
  /** Página efectiva (si la URL pide una que no existe, el backend usa la última). */
  page: number
  facets: ShopFacets
}

const API_SORT: Record<SortKey, string> = {
  recomendadas: 'recommended',
  'precio-asc': 'price_asc',
  'precio-desc': 'price_desc',
  nombre: 'name',
}

/** Traduce el estado de la Tienda (URL en español) a los parámetros de GET /products. */
export function toProductFilterParams(query: ShopQuery): URLSearchParams {
  const params = new URLSearchParams({
    sort: API_SORT[query.sort],
    page: String(query.page),
    limit: String(PAGE_SIZE),
  })
  query.categories.forEach((slug) => params.append('tags', slug))
  if (query.minPrice !== null) params.set('minPrice', String(query.minPrice))
  if (query.maxPrice !== null) params.set('maxPrice', String(query.maxPrice))
  return params
}

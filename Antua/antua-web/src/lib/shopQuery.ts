import type { Product } from '../types/product'

export const SORT_OPTIONS = [
  { value: 'recomendadas', label: 'Recomendadas' },
  { value: 'precio-asc', label: 'Menor precio' },
  { value: 'precio-desc', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['value']

export const DEFAULT_SORT: SortKey = 'recomendadas'
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
export const PARAM = {
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

export interface ShopResult {
  items: Product[]
  total: number
  totalPages: number
  /** Página efectiva (si la URL pide una que no existe, se usa la última). */
  page: number
}

const collator = new Intl.Collator('es-AR', { sensitivity: 'base' })

/**
 * TODO(api): GET /products no acepta filtros, orden ni paginación (product-filter.dto.ts está vacío),
 * así que se aplican acá sobre la lista completa. Cuando el backend acepte estos parámetros,
 * reemplazar esta función por una request con `toSearchParams(query)`; la UI no cambia.
 */
export function applyShopQuery(products: Product[], query: ShopQuery): ShopResult {
  const filtered = products.filter((p) => {
    // Categorías: alcanza con que el producto tenga alguna de las elegidas.
    if (query.categories.length > 0 && !p.tags.some((t) => query.categories.includes(t.slug))) return false
    if (query.minPrice !== null && p.fromPrice < query.minPrice) return false
    if (query.maxPrice !== null && p.fromPrice > query.maxPrice) return false
    return true
  })

  const sorted = [...filtered]
  if (query.sort === 'precio-asc') sorted.sort((a, b) => a.fromPrice - b.fromPrice)
  if (query.sort === 'precio-desc') sorted.sort((a, b) => b.fromPrice - a.fromPrice)
  if (query.sort === 'nombre') sorted.sort((a, b) => collator.compare(a.name, b.name))

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(query.page, totalPages)
  return { items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, totalPages, page }
}

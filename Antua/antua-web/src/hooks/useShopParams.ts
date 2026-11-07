import { useCallback, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { parseShopQuery, toSearchParams, type ShopQuery, type SortKey } from '../lib/shopQuery'

export interface ShopParams {
  query: ShopQuery
  toggleCategory: (slug: string) => void
  setPriceRange: (min: number | null, max: number | null) => void
  setSort: (sort: SortKey) => void
  clearFilters: () => void
  /** href de una página, para links reales (Ctrl/Cmd+clic, clic del medio). */
  pageHref: (page: number) => string
}

/** Lee y escribe el estado de la Tienda en la URL. Cambiar un filtro vuelve a la página 1. */
export function useShopParams(): ShopParams {
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  const query = useMemo(() => parseShopQuery(searchParams), [searchParams])

  const update = useCallback(
    (patch: Partial<ShopQuery>, options?: { replace?: boolean }) => {
      setSearchParams((prev) => toSearchParams({ ...parseShopQuery(prev), page: 1, ...patch }), {
        replace: options?.replace,
        preventScrollReset: true,
      })
    },
    [setSearchParams],
  )

  return {
    query,
    toggleCategory: (slug) =>
      update({
        categories: query.categories.includes(slug)
          ? query.categories.filter((c) => c !== slug)
          : [...query.categories, slug],
      }),
    // El precio se escribe con debounce: replace evita llenar el historial con cada tecla.
    setPriceRange: (minPrice, maxPrice) => update({ minPrice, maxPrice }, { replace: true }),
    setSort: (sort) => update({ sort }),
    // Limpia filtros pero conserva el orden elegido.
    clearFilters: () => update({ categories: [], minPrice: null, maxPrice: null }),
    pageHref: (page) => {
      const params = toSearchParams({ ...query, page }).toString()
      return params ? `${pathname}?${params}` : pathname
    },
  }
}

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useShopData } from '../hooks/useShopData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useShopParams } from '../hooks/useShopParams'
import { applyShopQuery, hasActiveFilters, PAGE_SIZE } from '../lib/shopQuery'
import type { Product } from '../types/product'
import { ProductCard } from '../components/product/ProductCard'
import { ProductGridSkeleton } from '../components/product/ProductGridSkeleton'
import { ShopFilters } from '../components/shop/ShopFilters'
import { SortSelect } from '../components/shop/SortSelect'
import { Pagination } from '../components/shop/Pagination'
import { Drawer } from '../components/ui/Drawer'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { skeletonBar } from '../components/ui/skeleton'

const GRID = 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'

/** Aviso que otra página manda al redirigir acá (ej.: checkout con el carrito vacío). */
const noticeFrom = (state: unknown): string | null =>
  typeof state === 'object' && state !== null && 'notice' in state && typeof state.notice === 'string' ? state.notice : null

const galletas = (n: number): string => `${n} ${n === 1 ? 'galleta' : 'galletas'}`

function priceBoundsOf(products: Product[]): { min: number; max: number } | null {
  const prices = products.map((p) => p.fromPrice).filter((p) => p > 0)
  return prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null
}

export default function Shop() {
  const { data, retry } = useShopData()
  const { query, toggleCategory, setPriceRange, setSort, clearFilters, pageHref } = useShopParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const notice = noticeFrom(useLocation().state)

  useDocumentTitle('Tienda')

  const products = data.status === 'ready' ? data.products : null
  const result = useMemo(() => (products ? applyShopQuery(products, query) : null), [products, query])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    products?.forEach((p) => p.tags.forEach((t) => (map[t.slug] = (map[t.slug] ?? 0) + 1)))
    return map
  }, [products])
  const priceBounds = useMemo(() => (products ? priceBoundsOf(products) : null), [products])

  // Al cambiar de página, volver al principio de la grilla.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [query.page])

  const activeCount = query.categories.length + (query.minPrice !== null || query.maxPrice !== null ? 1 : 0)
  const filters =
    data.status === 'ready' ? (
      <ShopFilters
        tags={data.tags}
        counts={counts}
        priceBounds={priceBounds}
        query={query}
        onToggleCategory={toggleCategory}
        onPriceChange={setPriceRange}
      />
    ) : null

  const clearButton = (
    <Button variant="secondary" onClick={clearFilters}>
      Limpiar filtros
    </Button>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.25rem,4vw,3rem)] leading-tight font-bold">Nuestras galletas</h1>
        <p className="mt-3 text-lg text-text-main/85 dark:text-dark-text-secondary">
          Horneadas en tandas chicas. Filtrá por lo que se te antoje.
        </p>
      </header>

      {notice && (
        <p role="status" className="mt-6 max-w-2xl rounded-xl bg-accent-secondary px-4 py-3 font-bold text-text-main dark:bg-dark-card dark:text-dark-text-main">
          {notice}
        </p>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Sidebar (escritorio) */}
        <aside aria-label="Filtros" className="hidden self-start rounded-card bg-surface p-6 shadow-soft lg:sticky lg:top-6 lg:block dark:bg-dark-surface dark:shadow-none">
          {filters ?? <FiltersSkeleton />}
          {hasActiveFilters(query) && <div className="mt-8">{clearButton}</div>}
        </aside>

        <section aria-labelledby="resultados-title" className="min-w-0">
          <h2 id="resultados-title" className="sr-only">
            Resultados
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-accent-tertiary px-5 font-bold transition-[background-color] duration-200 ease-out hover:bg-accent-secondary lg:hidden dark:border-dark-text-secondary dark:hover:bg-dark-card"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Filtros
                {activeCount > 0 && (
                  <span className="rounded-full bg-accent-main px-2 text-xs leading-5 text-bg tabular-nums dark:bg-dark-accent-main dark:text-dark-bg">
                    <span className="sr-only">, </span>
                    {activeCount}
                    <span className="sr-only">{activeCount === 1 ? ' filtro activo' : ' filtros activos'}</span>
                  </span>
                )}
              </button>
              <p aria-live="polite" className="text-sm font-bold text-text-main/80 tabular-nums dark:text-dark-text-secondary">
                {result ? galletas(result.total) : ''}
              </p>
            </div>
            <SortSelect value={query.sort} onChange={setSort} />
          </div>

          <div className="mt-6" aria-busy={data.status === 'loading'}>
            {data.status === 'loading' && <ProductGridSkeleton count={PAGE_SIZE} gridClassName={GRID} />}
            {data.status === 'error' && (
              <ErrorState title="No pudimos traer las galletas" message={data.message} onRetry={retry} />
            )}
            {result && result.total === 0 && (
              <EmptyState
                title="No encontramos galletas con esos filtros"
                message="Probá sacar alguna categoría o ampliar el rango de precio."
                action={clearButton}
              />
            )}
            {result && result.total > 0 && (
              <ul className={GRID}>
                {result.items.map((product, i) => (
                  <li key={product.id}>
                    <ProductCard product={product} priority={i < 3} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result && <Pagination page={result.page} totalPages={result.totalPages} hrefFor={pageHref} />}
        </section>
      </div>

      {/* Filtros en mobile: se aplican al instante; el botón solo cierra. */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        side="left"
        footer={
          <div className="flex flex-wrap gap-3">
            {hasActiveFilters(query) && clearButton}
            <Button onClick={() => setFiltersOpen(false)} className="flex-1">
              {result ? `Ver ${galletas(result.total)}` : 'Ver galletas'}
            </Button>
          </div>
        }
      >
        {filters ?? <FiltersSkeleton />}
      </Drawer>
    </div>
  )
}

function FiltersSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={`h-8 ${skeletonBar}`} />
      ))}
    </div>
  )
}

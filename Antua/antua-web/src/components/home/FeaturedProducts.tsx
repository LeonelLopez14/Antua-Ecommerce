import { useCallback, useEffect, useState } from 'react'
import { fetchProducts } from '../../api/products'
import { getApiErrorMessage } from '../../api/client'
import type { Product } from '../../types/product'
import { ButtonLink } from '../ui/ButtonLink'
import { ProductCard } from '../product/ProductCard'
import { ProductGridSkeleton } from '../product/ProductGridSkeleton'
import { ErrorState } from '../ui/ErrorState'

const FEATURED_COUNT = 4

type State = { status: 'loading' } | { status: 'ready'; products: Product[] } | { status: 'error'; message: string }

export function FeaturedProducts() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // TODO(api): no hay criterio de bestsellers en el backend; se muestran los primeros activos.
    fetchProducts(controller.signal)
      .then((products) => setState({ status: 'ready', products: products.slice(0, FEATURED_COUNT) }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: getApiErrorMessage(error) })
      })
    return () => controller.abort()
  }, [attempt])

  // Sin productos no tiene sentido mostrar la sección.
  if (state.status === 'ready' && state.products.length === 0) return null

  return (
    <section
      aria-labelledby="destacados-title"
      aria-busy={state.status === 'loading'}
      className="bg-surface dark:bg-dark-surface"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="destacados-title" className="font-display text-4xl leading-tight font-semibold">
              Las más pedidas
            </h2>
            <p className="mt-2 text-text-main/80 dark:text-dark-text-secondary">
              Las que se terminan primero cada semana.
            </p>
          </div>
          <ButtonLink to="/tienda" variant="secondary">
            Ver toda la tienda
          </ButtonLink>
        </div>

        <div className="mt-8">
          {state.status === 'loading' && <ProductGridSkeleton count={FEATURED_COUNT} />}
          {state.status === 'error' && (
            <ErrorState title="No pudimos traer las galletas" message={state.message} onRetry={retry} />
          )}
          {state.status === 'ready' && (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {state.products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Star } from 'lucide-react'
import { fetchOrder } from '../../api/orders'
import { fetchProducts } from '../../api/products'
import { useResource } from '../../hooks/useResource'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate, variantLabel } from '../../lib/format'
import { orderSummaryLines, orderSummaryTotals } from '../../lib/orderSummary'
import { OrderStatusBadge } from '../../components/account/OrderStatusBadge'
import { SummaryDetails } from '../../components/checkout/OrderSummary'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { skeletonBar } from '../../components/ui/skeleton'

/**
 * Detalle de un pedido (GET /orders/:id). Precios al momento de la compra (snapshot).
 * Si está entregado, cada galleta lleva a su ficha para dejar una reseña.
 */
export default function OrderDetail() {
  const { id = '' } = useParams()
  const orderId = Number(id)
  const validId = Number.isInteger(orderId) && orderId > 0
  const { state, retry } = useResource(validId ? `pedido-${orderId}` : null, (signal) => fetchOrder(orderId, signal))
  const order = state.status === 'ready' ? state.data : null
  const delivered = order?.status === 'delivered'

  // Los ítems del pedido no traen el producto (solo la variante): el slug se busca en el catálogo.
  const catalog = useResource(delivered ? 'catalogo' : null, fetchProducts)
  const slugByVariant = useMemo(() => {
    const map = new Map<number, string>()
    if (catalog.state.status === 'ready') {
      for (const product of catalog.state.data) for (const variant of product.variants) map.set(variant.id, product.slug)
    }
    return map
  }, [catalog.state])

  useDocumentTitle(validId ? `Pedido #${orderId}` : 'Pedido')

  const back = (
    <Link to="/cuenta/pedidos" className="inline-flex min-h-11 items-center gap-1 rounded-full pr-3 font-bold underline-offset-4 hover:underline">
      <ChevronLeft aria-hidden="true" className="size-5" />
      Mis pedidos
    </Link>
  )

  if (!validId || (state.status === 'error' && state.notFound)) {
    return (
      <>
        {back}
        <div className="mt-4">
          <EmptyState
            title="No encontramos ese pedido"
            message="Puede que el link esté mal escrito o que el pedido sea de otra cuenta."
            action={<ButtonLink to="/cuenta/pedidos">Ver mis pedidos</ButtonLink>}
          />
        </div>
      </>
    )
  }

  return (
    <article aria-labelledby="pedido-title">
      {back}

      {state.status === 'error' && (
        <div className="mt-4">
          <ErrorState title="No pudimos traer el pedido" message={state.message} onRetry={retry} />
        </div>
      )}

      {(state.status === 'loading' || state.status === 'idle') && (
        <div aria-hidden="true" className="mt-4 flex flex-col gap-4">
          <div className={`h-9 w-48 ${skeletonBar}`} />
          <div className="h-64 rounded-card bg-surface motion-safe:animate-pulse dark:bg-dark-card" />
        </div>
      )}

      {order && (
        <>
          <header className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="pedido-title" className="font-display text-3xl font-semibold tabular-nums">
              Pedido #{order.id}
            </h2>
            <OrderStatusBadge status={order.status} />
            <p className="w-full text-text-main/80 dark:text-dark-text-secondary">
              Hecho el {formatDate(order.createdAt) ?? 'fecha no disponible'}
            </p>
          </header>

          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
            <section aria-labelledby="detalle-title" className="rounded-card bg-surface p-6 shadow-soft dark:bg-dark-card dark:shadow-none">
              <h3 id="detalle-title" className="font-display text-xl font-semibold">
                Detalle
              </h3>
              <div className="mt-4">
                <SummaryDetails lines={orderSummaryLines(order)} couponCode={order.couponCode} totals={orderSummaryTotals(order)} />
              </div>
              <p className="mt-4 text-sm text-text-main/75 dark:text-dark-text-secondary">Precios al momento de la compra.</p>
            </section>

            <div className="flex flex-col gap-6">
              <section aria-labelledby="envio-title" className="rounded-card bg-accent-secondary p-6 dark:bg-dark-card">
                <h3 id="envio-title" className="font-bold">
                  Envío a
                </h3>
                <p className="mt-1">{order.shipping.fullName}</p>
                <p className="break-words">{order.shipping.street}</p>
                <p>
                  {order.shipping.city} ({order.shipping.postalCode})
                </p>
                <p>{order.shipping.phone}</p>
              </section>

              {delivered && (
                <section aria-labelledby="resenar-title" className="rounded-card bg-surface p-6 shadow-soft dark:bg-dark-card dark:shadow-none">
                  <h3 id="resenar-title" className="font-bold">
                    ¿Qué te parecieron?
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {order.items.map((item) => {
                      const slug = item.variantId !== null ? slugByVariant.get(item.variantId) : undefined
                      const name = `${item.productName}${item.variantName ? ` (${variantLabel(item.variantName)})` : ''}`
                      return (
                        <li key={item.id}>
                          {slug ? (
                            <Link
                              to={`/producto/${slug}#resenas`}
                              className="inline-flex min-h-11 items-center gap-2 rounded-full font-bold text-accent-main underline underline-offset-4 dark:text-dark-accent-main"
                            >
                              <Star aria-hidden="true" className="size-4" />
                              Reseñar {name}
                            </Link>
                          ) : (
                            <p className="text-sm text-text-main/80 dark:text-dark-text-secondary">
                              {name}
                              {catalog.state.status === 'ready' && ': ya no está a la venta.'}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </article>
  )
}

import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { fetchOrders } from '../../api/orders'
import { useAuthStore } from '../../stores/authStore'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDate, formatPrice, galletas } from '../../lib/format'
import { OrderStatusBadge } from '../../components/account/OrderStatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { skeletonBar } from '../../components/ui/skeleton'

/** Mis pedidos (GET /orders, el más nuevo primero). El backend no pagina: se muestran todos. */
export default function Orders() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const { state, retry } = useResource(`pedidos-${userId ?? ''}`, fetchOrders)

  usePageMeta('Mis pedidos', 'El estado y el detalle de tus pedidos en Antua.')

  return (
    <section aria-labelledby="pedidos-title">
      <h2 id="pedidos-title" className="font-display text-3xl font-semibold">
        Mis pedidos
      </h2>

      <div className="mt-6">
        {(state.status === 'loading' || state.status === 'idle') && (
          <>
            <p role="status" className="sr-only">
              Cargando tus pedidos…
            </p>
            <ul aria-hidden="true" className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex flex-col gap-3 rounded-card bg-surface p-6 dark:bg-dark-card">
                  <div className={`h-6 w-40 ${skeletonBar}`} />
                  <div className={`h-4 w-64 ${skeletonBar}`} />
                </li>
              ))}
            </ul>
          </>
        )}

        {state.status === 'error' && <ErrorState title="No pudimos traer tus pedidos" message={state.message} onRetry={retry} />}

        {state.status === 'ready' && state.data.length === 0 && (
          <EmptyState
            title="Todavía no hiciste pedidos"
            message="Cuando compres, vas a ver acá el estado de cada pedido."
            action={<ButtonLink to="/tienda">Ver galletas</ButtonLink>}
          />
        )}

        {state.status === 'ready' && state.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.data.map((order) => {
              const units = order.items.reduce((sum, item) => sum + item.quantity, 0)
              return (
                <li key={order.id}>
                  <Link
                    to={`/cuenta/pedidos/${order.id}`}
                    className="group flex items-center gap-4 rounded-card bg-surface p-5 shadow-soft transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0 sm:p-6 dark:bg-dark-card dark:shadow-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-display text-xl font-semibold tabular-nums">Pedido #{order.id}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-text-main/80 dark:text-dark-text-secondary">
                        {formatDate(order.createdAt) ?? 'Fecha no disponible'} · {galletas(units)}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-accent-main tabular-nums dark:text-dark-accent-main">{formatPrice(order.total)}</p>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

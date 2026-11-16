import { Link } from 'react-router-dom'
import { fetchStats } from '../../api/admin'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDateTime, formatNumber, formatPrice } from '../../lib/format'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { SalesChart } from '../../components/admin/SalesChart'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { ErrorState } from '../../components/ui/ErrorState'
import type { AdminStats } from '../../types/admin'

const card = 'rounded-card bg-surface p-5 shadow-soft dark:bg-dark-card dark:shadow-none'
const linkClass = 'font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main'

export default function Dashboard() {
  usePageMeta('Resumen · Panel')
  const { state, retry } = useResource('admin-stats', fetchStats)

  return (
    <>
      <AdminPageHeader title="Resumen" description="Cómo viene la tienda. Los días se cuentan en hora de Montevideo." />
      {state.status === 'loading' && (
        <div role="status">
          <span className="sr-only">Cargando el resumen…</span>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-card bg-text-main/10 motion-safe:animate-pulse dark:bg-dark-text-main/10" />
            ))}
          </div>
        </div>
      )}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar el resumen" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && <DashboardContent stats={state.data} />}
    </>
  )
}

function DashboardContent({ stats }: { stats: AdminStats }) {
  const periods = [
    { label: 'Hoy', ...stats.periods.today },
    { label: 'Últimos 7 días', ...stats.periods.last7Days },
    { label: 'Últimos 30 días', ...stats.periods.last30Days },
  ]
  const queues = [
    { label: 'Esperando el pago', value: stats.queues.pendingPayment, to: '/admin/pedidos?status=pending&payment_status=pending' },
    { label: 'Para preparar', value: stats.queues.toPrepare, to: '/admin/pedidos?status=pending&payment_status=paid' },
    { label: 'En preparación', value: stats.queues.preparing, to: '/admin/pedidos?status=preparing' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="ventas-title">
        <h2 id="ventas-title" className="sr-only">Ventas</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {periods.map((period) => (
            <li key={period.label} className={card}>
              <p className="text-sm font-bold text-text-main/75 dark:text-dark-text-secondary">{period.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-accent-main dark:text-dark-accent-main">{formatPrice(period.revenue)}</p>
              <p className="mt-1 text-sm tabular-nums">
                {formatNumber(period.orders)} {period.orders === 1 ? 'pedido' : 'pedidos'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="colas-title">
        <h2 id="colas-title" className="font-display text-2xl font-semibold">Para atender</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-3">
          {queues.map((queue) => (
            <li key={queue.label}>
              <Link to={queue.to} className={`${card} flex min-h-11 items-center justify-between gap-3 transition-[box-shadow] duration-200 ease-out hover:shadow-lift`}>
                <span className="font-bold">{queue.label}</span>
                <span className="font-display text-2xl font-bold tabular-nums">{formatNumber(queue.value)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="grafico-title" className={card}>
        <h2 id="grafico-title" className="font-display text-2xl font-semibold">Ventas de los últimos 30 días</h2>
        <div className="mt-4">
          <SalesChart days={stats.daily} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="top-title" className={card}>
          <h2 id="top-title" className="font-display text-xl font-semibold">Más vendidos (30 días)</h2>
          {stats.topProducts.length === 0 ? (
            <p className="mt-3 text-text-main/80 dark:text-dark-text-secondary">Todavía no hay ventas en el período.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {stats.topProducts.map((product) => (
                <li key={product.productId} className="flex items-baseline justify-between gap-3">
                  <Link to={`/admin/productos/${product.productId}`} className={`${linkClass} min-w-0 truncate`}>
                    {product.name}
                  </Link>
                  <span className="shrink-0 text-sm tabular-nums">{formatNumber(product.units)} u.</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="stock-title" className={card}>
          <h2 id="stock-title" className="font-display text-xl font-semibold">Stock bajo</h2>
          <p className="text-sm text-text-main/75 dark:text-dark-text-secondary">{stats.lowStock.threshold} unidades o menos</p>
          {stats.lowStock.variants.length === 0 ? (
            <p className="mt-3">Todo con stock suficiente.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {stats.lowStock.variants.map((variant) => (
                <li key={variant.variantId} className="flex items-baseline justify-between gap-3">
                  <Link to={`/admin/productos/${variant.productId}#variantes`} className={`${linkClass} min-w-0 truncate`}>
                    {variant.product} · {variant.name}
                  </Link>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{variant.stock === 0 ? 'Sin stock' : `${variant.stock} u.`}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/productos?lowStock=true" className={`${linkClass} mt-3 inline-flex min-h-11 items-center`}>
            Ver todos
          </Link>
        </section>

        <section aria-labelledby="resenas-title" className={card}>
          <h2 id="resenas-title" className="font-display text-xl font-semibold">Reseñas</h2>
          <p className="text-sm">
            <strong className="tabular-nums">{formatNumber(stats.reviews.last7Days)}</strong> nuevas en los últimos 7 días
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {stats.reviews.latest.map((review) => (
              <li key={review.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span aria-hidden="true">{'★'.repeat(review.rating)}</span>
                  <span className="sr-only">{review.rating} de 5 estrellas</span> · {review.product}
                </span>
                {review.is_hidden ? <StatusBadge label="Oculta" tone="muted" /> : <span className="text-text-main/75 dark:text-dark-text-secondary">{formatDateTime(review.created_at)}</span>}
              </li>
            ))}
          </ul>
          <Link to="/admin/resenas" className={`${linkClass} mt-3 inline-flex min-h-11 items-center`}>
            Moderar reseñas
          </Link>
        </section>
      </div>
    </div>
  )
}

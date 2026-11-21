import { useLocation, useParams } from 'react-router-dom'
import { fetchGuestOrder } from '../api/orders'
import { fetchPaymentState } from '../api/payments'
import { paymentStatusLabel } from '../lib/orderMessages'
import { RetryPaymentButton } from '../components/checkout/RetryPaymentButton'
import { useResource } from '../hooks/useResource'
import { usePageMeta } from '../hooks/usePageMeta'
import { useNoIndex } from '../hooks/useNoIndex'
import { formatDate } from '../lib/format'
import { orderSummaryLines, orderSummaryTotals } from '../lib/orderSummary'
import { OrderStatusBadge } from '../components/account/OrderStatusBadge'
import { SummaryDetails } from '../components/checkout/OrderSummary'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { ButtonLink } from '../components/ui/ButtonLink'
import { skeletonBar } from '../components/ui/skeleton'

/** Token del pedido en el fragmento: `/pedido/12#t=<token>`. El navegador nunca manda el `#…` al servidor. */
function tokenFromHash(hash: string): string | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('t')
  return value && /^[\w-]{16,}$/.test(value) ? value : null
}

/**
 * Pedido de invitado (GET /orders/guest/:id con X-Order-Token). Es adonde lleva el enlace del correo
 * de confirmación: para quien compró sin cuenta es la única forma de seguir su pedido. Sin el token
 * correcto, la API responde 404 (no revela si el pedido existe).
 */
export default function GuestOrder() {
  useNoIndex()
  const { id = '' } = useParams()
  const { hash } = useLocation()
  const orderId = Number(id)
  const token = tokenFromHash(hash)
  const valid = Number.isInteger(orderId) && orderId > 0 && token !== null
  const { state, retry } = useResource(valid ? `pedido-invitado-${orderId}` : null, (signal) => fetchGuestOrder(orderId, token ?? '', signal))
  const order = state.status === 'ready' ? state.data : null
  const payment = useResource(order ? `pago-invitado-${order.id}` : null, (signal) => fetchPaymentState(orderId, token, undefined, signal))

  usePageMeta(valid ? `Pedido #${orderId}` : 'Pedido', 'El estado de tu pedido en Antojarte.')

  if (!valid || (state.status === 'error' && state.notFound)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="sr-only">Pedido</h1>
        <EmptyState
          headingLevel={2}
          title="No encontramos ese pedido"
          message="El enlace puede estar incompleto. Abrilo de nuevo desde el correo de confirmación, tal como llegó."
          action={<ButtonLink to="/tienda">Ver galletas</ButtonLink>}
        />
      </div>
    )
  }

  return (
    <article aria-labelledby="pedido-title" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <h1 id="pedido-title" className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-bold tabular-nums">
        Pedido #{orderId}
      </h1>

      {state.status === 'error' && (
        <div className="mt-4">
          <ErrorState headingLevel={2} title="No pudimos traer el pedido" message={state.message} onRetry={retry} />
        </div>
      )}

      {(state.status === 'loading' || state.status === 'idle') && (
        <>
          <p role="status" className="sr-only">
            Cargando tu pedido…
          </p>
          <div aria-hidden="true" className="mt-4 flex flex-col gap-4">
            <div className={`h-8 w-56 ${skeletonBar}`} />
            <div className="h-64 rounded-card bg-surface motion-safe:animate-pulse dark:bg-dark-card" />
          </div>
        </>
      )}

      {order && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <OrderStatusBadge status={order.status} />
            <span className="inline-flex items-center rounded-full bg-accent-secondary px-3 py-1 text-xs font-bold text-text-main dark:bg-dark-card dark:text-dark-accent-main">
              {paymentStatusLabel(order.paymentStatus)}
            </span>
            <p className="w-full text-text-main/80 dark:text-dark-text-secondary">
              Hecho el {formatDate(order.createdAt) ?? 'fecha no disponible'}. Este enlace es tu acceso al pedido: no lo compartas.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
            <section aria-labelledby="detalle-title" className="rounded-card bg-surface p-6 shadow-soft dark:bg-dark-card dark:shadow-none">
              <h2 id="detalle-title" className="font-display text-xl font-semibold">
                Detalle
              </h2>
              <div className="mt-4">
                <SummaryDetails lines={orderSummaryLines(order)} couponCode={order.couponCode} totals={orderSummaryTotals(order)} />
              </div>
              <p className="mt-4 text-sm text-text-main/75 dark:text-dark-text-secondary">Precios al momento de la compra.</p>
              {payment.state.status === 'ready' && payment.state.data.canPay && (
                <div className="mt-6">
                  <RetryPaymentButton orderId={order.id} accessToken={token} />
                </div>
              )}
            </section>

            <section aria-labelledby="envio-title" className="rounded-card bg-accent-secondary p-6 dark:bg-dark-card">
              <h2 id="envio-title" className="font-bold">
                Envío a
              </h2>
              <p className="mt-1">{order.shipping.fullName}</p>
              <p className="break-words">{order.shipping.street}</p>
              <p>
                {order.shipping.city} ({order.shipping.postalCode})
              </p>
            </section>
          </div>
        </>
      )}
    </article>
  )
}

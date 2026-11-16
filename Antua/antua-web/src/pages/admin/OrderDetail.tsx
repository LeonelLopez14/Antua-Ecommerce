import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { changeOrderStatus, fetchAdminOrder, saveOrderNote } from '../../api/admin'
import { getApiErrorMessage } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDateTime, formatExactPrice, formatPrice, shippingEtaLabel, variantLabel } from '../../lib/format'
import { ORDER_ACTION_LABEL, orderInfo, paymentInfo } from '../../lib/adminLabels'
import { toast } from '../../stores/toastStore'
import type { AdminOrder, OrderStatusValue } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { TextAreaField } from '../../components/admin/fields'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ErrorState } from '../../components/ui/ErrorState'

const card = 'rounded-card bg-surface p-5 shadow-soft sm:p-6 dark:bg-dark-card dark:shadow-none'
const backLink = (
  <Link to="/admin/pedidos" className="inline-flex min-h-11 items-center gap-1 font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
    <ArrowLeft aria-hidden="true" className="size-4" />
    Pedidos
  </Link>
)

const CONFIRM_TEXT: Record<OrderStatusValue, string> = {
  pending: '',
  preparing: 'El pedido pasa a preparación.',
  shipped: 'Se marca como enviado. Después solo puede pasar a entregado.',
  delivered: 'Se marca como entregado. Es el estado final: el cliente ya puede dejar reseñas.',
  canceled: 'Se devuelven el stock y el uso del cupón. Si ya estaba pagado, el dinero hay que devolverlo desde Mercado Pago. No se puede deshacer.',
}

export default function OrderDetail() {
  const { id } = useParams()
  const orderId = Number(id)
  const { state, retry, setData } = useResource(`admin-order-${orderId}`, (signal) => fetchAdminOrder(orderId, signal))
  usePageMeta(`Pedido #${orderId} · Panel`)

  if (state.status === 'loading') return <LoadingRows label="Cargando el pedido…" />
  if (state.status === 'error') {
    return (
      <>
        <AdminPageHeader title={`Pedido #${orderId}`} back={backLink} />
        <ErrorState headingLevel={2} title={state.notFound ? 'Ese pedido no existe' : 'No pudimos cargar el pedido'} message={state.message} onRetry={retry} />
      </>
    )
  }
  if (state.status !== 'ready') return null
  return <OrderView order={state.data} onChange={(next) => setData(() => next)} />
}

function OrderView({ order, onChange }: { order: AdminOrder; onChange: (order: AdminOrder) => void }) {
  const [target, setTarget] = useState<OrderStatusValue | null>(null)
  const [pending, setPending] = useState(false)
  const [note, setNote] = useState(order.internal_note ?? '')
  const [savingNote, setSavingNote] = useState(false)

  const apply = async () => {
    if (!target) return
    setPending(true)
    try {
      const updated = await changeOrderStatus(order.id, target)
      onChange(updated)
      toast(updated.notice ?? `Pedido #${order.id}: ${orderInfo(updated.status).label.toLowerCase()}.`)
      setTarget(null)
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
      setTarget(null)
    } finally {
      setPending(false)
    }
  }

  const submitNote = async (event: FormEvent) => {
    event.preventDefault()
    setSavingNote(true)
    try {
      onChange(await saveOrderNote(order.id, note.trim()))
      toast('Nota interna guardada.')
    } catch (error) {
      toast(getApiErrorMessage(error), 'error')
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title={`Pedido #${order.id}`}
        description={`Hecho el ${formatDateTime(order.created_at) ?? ''}`}
        back={backLink}
        actions={
          <>
            <StatusBadge {...orderInfo(order.status)} />
            <StatusBadge {...paymentInfo(order.payment.status)} />
          </>
        }
      />

      <section aria-labelledby="acciones-title" className={`${card} mb-6`}>
        <h2 id="acciones-title" className="font-display text-xl font-semibold">
          Estado
        </h2>
        {order.allowedTransitions.length === 0 ? (
          <p className="mt-2">
            {order.status === 'pending'
              ? 'Esperando el pago: cuando se apruebe, vas a poder pasarlo a preparación.'
              : 'Este pedido ya no cambia de estado.'}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {order.allowedTransitions.map((status) => (
              <Button key={status} variant={status === 'canceled' ? 'secondary' : 'primary'} onClick={() => setTarget(status)}>
                {ORDER_ACTION_LABEL[status]}
              </Button>
            ))}
          </div>
        )}
        {order.status === 'pending' && order.allowedTransitions.includes('canceled') && !order.allowedTransitions.includes('preparing') && (
          <p className="mt-3 text-sm text-text-main/80 dark:text-dark-text-secondary">Para prepararlo, el pago tiene que estar aprobado.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="items-title" className={`${card} lg:col-span-2`}>
          <h2 id="items-title" className="font-display text-xl font-semibold">
            Productos
          </h2>
          <ul className="mt-3 divide-y divide-text-main/10 dark:divide-dark-text-main/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-bold break-words">{item.product_name}</p>
                  <p className="text-sm text-text-main/75 dark:text-dark-text-secondary">
                    {item.variant ? `${variantLabel(item.variant.name)} · ` : ''}
                    {item.variant && <code translate="no">{item.variant.sku}</code>}
                  </p>
                </div>
                <p className="tabular-nums">
                  {item.quantity} × {formatExactPrice(item.unit_price)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-text-main/15 pt-3 tabular-nums dark:border-dark-text-main/15">
            <dt>Subtotal</dt>
            <dd className="text-right">{formatPrice(order.totals.subtotal)}</dd>
            {order.totals.discount > 0 && (
              <>
                <dt>
                  Descuento{' '}
                  {order.coupon && (
                    <code translate="no" className="text-sm">
                      ({order.coupon.code})
                    </code>
                  )}
                </dt>
                <dd className="text-right">−{formatPrice(order.totals.discount)}</dd>
              </>
            )}
            <dt>Envío</dt>
            <dd className="text-right">{formatPrice(order.totals.shipping)}</dd>
            <dt className="font-bold">Total</dt>
            <dd className="text-right font-bold text-accent-main dark:text-dark-accent-main">{formatPrice(order.totals.total)}</dd>
          </dl>
        </section>

        <section aria-labelledby="cliente-title" className={card}>
          <h2 id="cliente-title" className="font-display text-xl font-semibold">
            Cliente y envío
          </h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div>
              <dt className="font-bold">Contacto</dt>
              <dd className="break-words">
                {order.contact.name} · <span translate="no">{order.contact.email ?? 'sin email'}</span> {order.contact.isGuest ? '(invitado)' : '(con cuenta)'}
              </dd>
              <dd>{order.contact.phone}</dd>
            </div>
            <div>
              <dt className="font-bold">Dirección</dt>
              <dd className="break-words">
                {order.shipping.street}, {order.shipping.city} ({order.shipping.postal_code})
              </dd>
              {order.shipping.eta_days && <dd>{shippingEtaLabel(order.shipping.eta_days)}</dd>}
            </div>
          </dl>
        </section>

        <section aria-labelledby="pago-title" className={card}>
          <h2 id="pago-title" className="font-display text-xl font-semibold">
            Pago <span className="text-sm font-normal">(solo lectura)</span>
          </h2>
          <p className="mt-2">
            <StatusBadge {...paymentInfo(order.payment.status)} />
          </p>
          {order.payment.expires_at && order.status === 'pending' && order.payment.status !== 'paid' && (
            <p className="mt-2 text-sm">Vence el {formatDateTime(order.payment.expires_at)}.</p>
          )}
          {order.payment.attempts.length === 0 ? (
            <p className="mt-2 text-sm text-text-main/80 dark:text-dark-text-secondary">
              {order.payment.expires_at ? 'Todavía no hay intentos de pago.' : 'Pedido sin pago en línea: el cobro se coordina aparte.'}
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {order.payment.attempts.map((attempt) => (
                <li key={attempt.id} className="tabular-nums">
                  {formatDateTime(attempt.created_at)} · {attempt.status}
                  {attempt.amount !== null && ` · ${formatExactPrice(attempt.amount)}`}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="nota-title" className={card}>
          <h2 id="nota-title" className="font-display text-xl font-semibold">
            Nota interna
          </h2>
          <form onSubmit={(event) => void submitNote(event)} className="mt-3 flex flex-col gap-3">
            <TextAreaField
              id="nota-interna"
              label="Solo la ve el equipo"
              rows={4}
              maxLength={2000}
              value={note}
              placeholder="Llamar antes de ir…"
              onChange={(e) => setNote(e.target.value)}
            />
            <div>
              <Button type="submit" variant="secondary" loading={savingNote} disabled={note.trim() === (order.internal_note ?? '')}>
                Guardar nota
              </Button>
            </div>
          </form>
        </section>

        <section aria-labelledby="historial-title" className={card}>
          <h2 id="historial-title" className="font-display text-xl font-semibold">
            Historial
          </h2>
          {order.history.length === 0 ? (
            <p className="mt-2 text-sm">Sin cambios de estado desde el panel.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              {order.history.map((entry) => (
                <li key={entry.id}>
                  <p className="font-bold">
                    {orderInfo(entry.from).label} → {orderInfo(entry.to).label}
                  </p>
                  <p className="text-text-main/75 dark:text-dark-text-secondary">
                    {formatDateTime(entry.created_at)} · {entry.by?.name ?? 'Usuario borrado'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={target !== null}
        title={target ? `¿${ORDER_ACTION_LABEL[target]} #${order.id}?` : ''}
        confirmLabel={target ? ORDER_ACTION_LABEL[target] : ''}
        cancelLabel="Volver"
        safeFirst={target === 'canceled'}
        pending={pending}
        onConfirm={() => void apply()}
        onCancel={() => setTarget(null)}
      >
        <p>{target ? CONFIRM_TEXT[target] : ''}</p>
      </ConfirmDialog>
    </>
  )
}

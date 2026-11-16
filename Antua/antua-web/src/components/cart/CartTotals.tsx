import { formatPrice, shippingEtaLabel } from '../../lib/format'
import type { CartSummary } from '../../types/cart'

interface CartTotalsProps {
  summary: CartSummary
  couponCode: string | null
}

/** Totales tal cual los devuelve el backend. Ningún monto se calcula en el cliente. */
export function CartTotals({ summary, couponCode }: CartTotalsProps) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm tabular-nums">
      <dt>Subtotal</dt>
      <dd className="text-right">{formatPrice(summary.subtotal)}</dd>

      {summary.discount > 0 && (
        <>
          <dt>
            Descuento
            {couponCode && (
              <span className="text-text-main/75 dark:text-dark-text-secondary">
                {' '}
                (<span translate="no">{couponCode}</span>)
              </span>
            )}
          </dt>
          <dd className="text-right">−{formatPrice(summary.discount)}</dd>
        </>
      )}

      <dt>
        Envío
        {summary.shippingEtaDays !== null && (
          <span className="block text-xs text-text-main/75 dark:text-dark-text-secondary">{shippingEtaLabel(summary.shippingEtaDays)}</span>
        )}
      </dt>
      <dd className="text-right">
        {summary.shipping === null ? (
          <span className="text-text-main/75 dark:text-dark-text-secondary">Se calcula en el checkout</span>
        ) : (
          formatPrice(summary.shipping)
        )}
      </dd>

      <dt className="mt-2 text-base font-bold">{summary.shipping === null ? 'Total sin envío' : 'Total'}</dt>
      <dd className="mt-2 text-right text-lg font-bold text-accent-main dark:text-dark-accent-main">{formatPrice(summary.total)}</dd>
    </dl>
  )
}

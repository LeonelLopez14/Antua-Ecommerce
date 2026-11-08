import { ChevronDown } from 'lucide-react'
import { formatPrice, variantLabel } from '../../lib/format'
import { ProductImage } from '../product/ProductImage'

export interface SummaryLine {
  key: number
  name: string
  variantName: string | null
  quantity: number
  unitPrice: number
  imageUrl: string | null
}

/** Totales tal cual los devuelve el backend (carrito o pedido). Nunca se calculan en el cliente. */
export interface SummaryTotals {
  subtotal: number
  discount: number
  shipping: number | null
  total: number
}

interface SummaryContentProps {
  lines: SummaryLine[]
  couponCode: string | null
  totals: SummaryTotals
}

interface OrderSummaryProps extends SummaryContentProps {
  /** `collapsible`: mobile, arriba del formulario. `panel`: escritorio, fijo a la derecha. */
  variant: 'collapsible' | 'panel'
}

/**
 * Resumen del pedido (DESIGN.md §4): `accent-secondary`, idéntico en los 4 pasos.
 * En escritorio queda fijo a la derecha; en mobile es colapsable arriba del formulario.
 */
export function OrderSummary({ variant, ...props }: OrderSummaryProps) {
  if (variant === 'collapsible') {
    return (
      <details className="group rounded-card bg-accent-secondary text-text-main lg:hidden dark:bg-dark-card dark:text-dark-text-main">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-3 font-bold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <ChevronDown aria-hidden="true" className="size-5 transition-transform duration-200 ease-out group-open:rotate-180" />
            Resumen del pedido
          </span>
          <span className="text-accent-main tabular-nums dark:text-dark-accent-main">{formatPrice(props.totals.total)}</span>
        </summary>
        <div className="px-5 pb-5">
          <SummaryDetails {...props} />
        </div>
      </details>
    )
  }

  return (
    <aside
      aria-labelledby="resumen-title"
      className="hidden self-start rounded-card bg-accent-secondary p-6 text-text-main lg:sticky lg:top-6 lg:block dark:bg-dark-card dark:text-dark-text-main"
    >
      <h2 id="resumen-title" className="font-display text-2xl font-semibold">
        Resumen del pedido
      </h2>
      <div className="mt-4">
        <SummaryDetails {...props} />
      </div>
    </aside>
  )
}

/** Líneas y totales sin el contenedor: lo reutiliza el detalle de un pedido en la cuenta. */
export function SummaryDetails({ lines, couponCode, totals }: SummaryContentProps) {
  return (
    <>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center gap-3">
            <ProductImage url={line.imageUrl} width={56} height={56} className="size-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{line.name}</p>
              {line.variantName && (
                <p className="text-sm text-text-main/75 dark:text-dark-text-secondary">{variantLabel(line.variantName)}</p>
              )}
            </div>
            <p className="shrink-0 text-right text-sm tabular-nums">
              {line.quantity} × {formatPrice(line.unitPrice)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t border-text-main/15 pt-4 text-sm tabular-nums dark:border-dark-text-main/15">
        <dt>Subtotal</dt>
        <dd className="text-right">{formatPrice(totals.subtotal)}</dd>
        {couponCode && (
          <>
            <dt>
              Cupón <span translate="no" className="font-bold">{couponCode}</span>
            </dt>
            <dd className="text-right">−{formatPrice(totals.discount)}</dd>
          </>
        )}
        <dt>Envío (tarifa fija)</dt>
        <dd className="text-right">{totals.shipping === null ? 'A confirmar' : formatPrice(totals.shipping)}</dd>
        <dt className="mt-2 text-base font-bold">Total</dt>
        <dd className="mt-2 text-right text-lg font-bold text-accent-main dark:text-dark-accent-main">{formatPrice(totals.total)}</dd>
      </dl>
    </>
  )
}

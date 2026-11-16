import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import type { CheckoutForm } from '../../lib/checkoutForm'
import type { OrderError } from '../../lib/orderMessages'
import { formatPrice, variantLabel } from '../../lib/format'
import { useCartStore } from '../../stores/cartStore'
import { Button } from '../ui/Button'
import { ButtonLink } from '../ui/ButtonLink'

interface ConfirmStepProps {
  form: CheckoutForm
  /** Email al que se avisa: el del invitado o el de la cuenta. */
  email: string | null
  shipping: number | null
  placing: boolean
  error: OrderError | null
  onPlace: () => void
  /** Con pagos activos, el botón lleva a pagar y este repaso está en el paso de Pago. */
  payOnline: boolean
}

/** Paso 4 (antes de crear el pedido): repaso de los datos y "Confirmar pedido". */
export function ConfirmStep({ form, email, shipping, placing, error, onPlace, payOnline }: ConfirmStepProps) {
  const idleLabel = payOnline ? 'Pagar con Mercado Pago' : 'Confirmar pedido'
  const openCart = useCartStore((s) => s.open)

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Recap title="Contacto" editTo="?paso=1">
          <p>{form.fullName}</p>
          <p>{form.phone}</p>
          {email && (
            <p translate="no" className="break-all">
              {email}
            </p>
          )}
        </Recap>
        <Recap title="Entrega" editTo="?paso=1">
          <p className="break-words">{form.street}</p>
          <p>
            {form.city} ({form.postalCode})
          </p>
        </Recap>
        <Recap title="Envío" editTo="?paso=2">
          <p>
            A domicilio · <span className="tabular-nums">{shipping === null ? 'a confirmar' : formatPrice(shipping)}</span>
          </p>
        </Recap>
        {!payOnline && (
          <Recap title="Pago" editTo="?paso=3">
            <p>Lo coordinamos con vos después del pedido.</p>
          </Recap>
        )}
      </dl>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-accent-main bg-bg p-4 dark:border-dark-accent-main dark:bg-dark-bg">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div className="min-w-0">
            <p className="font-bold">{error.priceChanges ? 'Cambiaron algunos precios' : 'No pudimos confirmar tu pedido'}</p>
            {error.priceChanges && (
              <ul className="mt-1 flex flex-col gap-1 tabular-nums">
                {error.priceChanges.map((change) => (
                  <li key={`${change.productName}-${change.variantName}`} className="break-words">
                    El precio de {change.productName} ({variantLabel(change.variantName)}) cambió de {formatPrice(change.oldPrice)} a{' '}
                    <strong>{formatPrice(change.newPrice)}</strong>.
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1">{error.message}</p>
            {error.reviewCart && (
              <Button variant="secondary" onClick={(event) => openCart(event.currentTarget)} className="mt-3">
                Revisar el carrito
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* El botón sigue habilitado hasta que arranca la request; durante la request, `loading` evita el doble clic. */}
        <Button onClick={onPlace} loading={placing}>
          {placing ? (payOnline ? 'Te llevamos al pago…' : 'Confirmando…') : error?.priceChanges ? 'Confirmar con los precios nuevos' : idleLabel}
        </Button>
        <ButtonLink to={payOnline ? '?paso=2' : '?paso=3'} variant="secondary">
          {payOnline ? 'Volver al envío' : 'Volver al pago'}
        </ButtonLink>
      </div>
      <p className="text-sm text-text-main/80 dark:text-dark-text-secondary">
        Al confirmar, revisamos el stock y los precios del momento y registramos tu pedido.
      </p>
    </div>
  )
}

function Recap({ title, editTo, children }: { title: string; editTo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-bg p-4 dark:bg-dark-bg">
      <dt className="flex items-center justify-between gap-2 font-bold">
        {title}
        <Link to={editTo} className="rounded-sm text-sm font-bold text-accent-main underline underline-offset-4 dark:text-dark-accent-main">
          Cambiar<span className="sr-only"> {title.toLowerCase()}</span>
        </Link>
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  )
}

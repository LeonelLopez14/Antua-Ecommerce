import { Truck } from 'lucide-react'
import { formatPrice, shippingEtaLabel } from '../../lib/format'
import { ButtonLink } from '../ui/ButtonLink'

interface ShippingStepProps {
  /** Costo de envío tal cual lo devuelve el backend (SHIPPING_FLAT_RATE). */
  shipping: number | null
  /** Plazo estimado en días. null: el backend no informa uno. */
  etaDays: number | null
}

/** Paso 2. Método único y fijo, sin selector (DESIGN.md §7). Costo y plazo salen del backend. */
export function ShippingStep({ shipping, etaDays }: ShippingStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-4 rounded-xl border-2 border-accent-main bg-bg p-4 dark:border-dark-accent-main dark:bg-dark-bg">
        <Truck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-main dark:text-dark-accent-main" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Envío a domicilio</p>
          <p className="mt-1 text-sm text-text-main/80 dark:text-dark-text-secondary">
            Es nuestro único método de envío. Te escribimos para coordinar el día y el horario de entrega.
          </p>
          {etaDays !== null && <p className="mt-1 text-sm font-bold">{shippingEtaLabel(etaDays)}.</p>}
        </div>
        <p className="shrink-0 font-bold text-accent-main tabular-nums dark:text-dark-accent-main">
          {shipping === null ? 'A confirmar' : formatPrice(shipping)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink to="?paso=3">Continuar al pago</ButtonLink>
        <ButtonLink to="?paso=1" variant="secondary">
          Volver a la dirección
        </ButtonLink>
      </div>
    </div>
  )
}

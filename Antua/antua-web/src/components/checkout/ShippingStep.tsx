import { Truck } from 'lucide-react'
import { formatPrice } from '../../lib/format'
import { ButtonLink } from '../ui/ButtonLink'

interface ShippingStepProps {
  /** Costo de envío tal cual lo devuelve el backend (SHIPPING_FLAT_RATE). */
  shipping: number | null
}

/**
 * Paso 2. Método único y fijo, sin selector (DESIGN.md §7). El backend informa solo el costo;
 * el plazo de entrega no existe en la API, así que no se muestra uno inventado.
 */
export function ShippingStep({ shipping }: ShippingStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-4 rounded-xl border-2 border-accent-main bg-bg p-4 dark:border-dark-accent-main dark:bg-dark-bg">
        <Truck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-main dark:text-dark-accent-main" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Envío a domicilio</p>
          <p className="mt-1 text-sm text-text-main/80 dark:text-dark-text-secondary">
            Es nuestro único método de envío. Te escribimos para coordinar el día y el horario de entrega.
          </p>
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

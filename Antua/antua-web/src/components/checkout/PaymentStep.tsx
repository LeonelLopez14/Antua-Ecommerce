import type { ReactNode } from 'react'
import { Info, ShieldCheck } from 'lucide-react'
import { ButtonLink } from '../ui/ButtonLink'

interface PaymentStepProps {
  /** Con pagos activos, el backend devuelve la URL de Mercado Pago. Si no, se coordina el pago. */
  enabled: boolean
  /** Repaso y botón de pagar (solo con pagos activos). */
  children: ReactNode
}

/**
 * Paso 3. Con Mercado Pago Checkout Pro se paga en su página: acá no hay ni puede haber
 * campos de tarjeta. Sin pagos activos, el pedido se registra y se coordina el pago.
 */
export function PaymentStep({ enabled, children }: PaymentStepProps) {
  if (enabled) {
    return (
      <div className="flex flex-col gap-6">
        <div role="note" className="flex items-start gap-4 rounded-xl bg-bg p-4 dark:bg-dark-bg">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div>
            <p className="font-bold">Pagás en Mercado Pago</p>
            <p className="mt-1 text-text-main/85 dark:text-dark-text-secondary">
              Te llevamos a su página para pagar. Los datos de tu tarjeta nunca pasan por Antua.
            </p>
          </div>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div role="note" className="flex items-start gap-4 rounded-xl bg-bg p-4 dark:bg-dark-bg">
        <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-main dark:text-dark-accent-main" />
        <div>
          <p className="font-bold">El pago online llega pronto</p>
          <p className="mt-1 text-text-main/85 dark:text-dark-text-secondary">
            Tu pedido se registra y te contactamos para coordinar el pago. No te vamos a pedir datos de tarjeta.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink to="?paso=4">Revisar y confirmar</ButtonLink>
        <ButtonLink to="?paso=2" variant="secondary">
          Volver al envío
        </ButtonLink>
      </div>
    </div>
  )
}

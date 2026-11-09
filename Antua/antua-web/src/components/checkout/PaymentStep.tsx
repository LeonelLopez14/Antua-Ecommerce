import { Info } from 'lucide-react'
import { ButtonLink } from '../ui/ButtonLink'

/**
 * Paso 3. antua-api todavía no tiene módulo de pagos (PaymentsController y PaymentsService
 * están vacíos), así que este paso no pide tarjeta ni simula un cobro.
 *
 * TODO(payments): cuando exista POST /orders/:id/payment (ver Documentation/Antojarte_API_NestJS.pdf §10),
 * este es el único lugar a conectar: elegir el método acá y, en la confirmación, llamar a la API
 * de pagos después de POST /orders. Hasta entonces el pedido queda con payment_status "pending".
 */
export function PaymentStep() {
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

import { CircleCheck, UserPlus } from 'lucide-react'
import type { Order } from '../../types/order'
import { useAuthModalStore } from '../../stores/authModalStore'
import { RetryPaymentButton } from './RetryPaymentButton'
import { Button } from '../ui/Button'
import { ButtonLink } from '../ui/ButtonLink'

interface OrderPlacedProps {
  order: Order
  /** El pedido se hizo sin sesión: se ofrece crear una cuenta (recién acá, DESIGN.md §4). */
  isGuest: boolean
  /** Resultado de vincular el pedido a la cuenta recién creada. */
  claimNotice: string
  /** Pagos activos pero no se pudo abrir el checkout: se ofrece reintentar. */
  paymentRetry: { message: string; accessToken: string | null } | null
}

/** Paso 4 (pedido creado): número, dirección y próximos pasos. El resumen sigue a la derecha. */
export function OrderPlaced({ order, isGuest, claimNotice, paymentRetry }: OrderPlacedProps) {
  const openAuth = useAuthModalStore((s) => s.open)
  const email = order.guestEmail

  return (
    <div className="flex flex-col gap-8">
      <p aria-live="polite" className={claimNotice ? 'rounded-xl bg-bg px-4 py-3 font-bold dark:bg-dark-bg' : 'sr-only'}>
        {claimNotice}
      </p>
      <div className="flex items-start gap-4">
        <CircleCheck aria-hidden="true" className="size-10 shrink-0 text-accent-main dark:text-dark-accent-main" />
        <div>
          <p className="text-sm font-bold tracking-wide text-text-main/80 uppercase dark:text-dark-text-secondary">Número de pedido</p>
          <p className="font-display text-4xl font-bold tabular-nums">#{order.id}</p>
          <p className="mt-2 text-text-main/85 dark:text-dark-text-secondary">
            Guardá este número: lo vas a necesitar si nos escribís por tu pedido.
          </p>
        </div>
      </div>

      {paymentRetry && (
        <div role="alert" className="rounded-xl border-2 border-accent-main bg-bg p-4 dark:border-dark-accent-main dark:bg-dark-bg">
          <p className="font-bold">Tu pedido está registrado, pero falta el pago</p>
          <p className="mb-3">{paymentRetry.message}</p>
          <RetryPaymentButton orderId={order.id} accessToken={paymentRetry.accessToken} />
        </div>
      )}

      <section aria-labelledby="entrega-title" className="rounded-xl bg-bg p-4 dark:bg-dark-bg">
        <h3 id="entrega-title" className="font-bold">
          Lo enviamos a
        </h3>
        <p className="mt-1">{order.shipping.fullName}</p>
        <p className="break-words">{order.shipping.street}</p>
        <p>
          {order.shipping.city} ({order.shipping.postalCode}) · {order.shipping.phone}
        </p>
      </section>

      <section aria-labelledby="pasos-title">
        <h3 id="pasos-title" className="font-display text-xl font-semibold">
          ¿Y ahora?
        </h3>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 marker:font-bold">
          <li>
            {paymentRetry || order.paymentStatus === 'paid' ? (
              <>Te avisamos {email ? <>a <span translate="no">{email}</span></> : 'por email'} cuando confirmemos el pago.</>
            ) : (
              <>
                Te contactamos {email ? <>a <span translate="no">{email}</span></> : 'por email'} para coordinar el pago.
              </>
            )}
          </li>
          <li>Horneamos tus galletas en la próxima tanda.</li>
          <li>Coordinamos con vos el día de entrega.</li>
        </ol>
      </section>

      {isGuest && (
        <section aria-labelledby="cuenta-title" className="rounded-xl border-2 border-accent-tertiary p-4 dark:border-dark-text-secondary/60">
          <h3 id="cuenta-title" className="font-bold">
            ¿Te creás una cuenta?
          </h3>
          <p className="mt-1 text-sm text-text-main/85 dark:text-dark-text-secondary">
            Si te creás una cuenta ahora, este pedido queda guardado en “Mis pedidos” y podés guardar tus direcciones. Igual, el pedido ya está registrado.
          </p>
          <Button variant="secondary" onClick={(event) => openAuth('register', event.currentTarget)} className="mt-3">
            <UserPlus aria-hidden="true" className="size-4" />
            Crear cuenta
          </Button>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {!isGuest && <ButtonLink to={`/cuenta/pedidos/${order.id}`}>Ver el pedido en mi cuenta</ButtonLink>}
        <ButtonLink to="/tienda" variant={isGuest ? 'primary' : 'secondary'}>
          Seguir comprando
        </ButtonLink>
      </div>
    </div>
  )
}

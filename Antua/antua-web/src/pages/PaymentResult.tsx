import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleAlert, CircleCheck, Clock, UserPlus, type LucideIcon } from 'lucide-react'
import { claimGuestOrder } from '../api/orders'
import { useAuthModalStore } from '../stores/authModalStore'
import { fetchPaymentState } from '../api/payments'
import { useAuthStore } from '../stores/authStore'
import { useResource } from '../hooks/useResource'
import { usePageMeta } from '../hooks/usePageMeta'
import { readPlacedOrder, writePlacedOrder } from '../lib/placedOrder'
import { RetryPaymentButton } from '../components/checkout/RetryPaymentButton'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'
import { skeletonBar } from '../components/ui/skeleton'

type ReturnKind = 'exitoso' | 'pendiente' | 'fallido'

interface Message {
  title: string
  text: string
  Icon: LucideIcon
}

/** Texto según lo que devuelve el SERVIDOR: la URL de retorno se puede escribir a mano. */
const BY_STATUS: Record<string, Message> = {
  paid: { title: '¡Pago aprobado!', text: 'Ya recibimos tu pago. Empezamos a preparar tus galletas.', Icon: CircleCheck },
  pending: { title: 'Estamos esperando la confirmación', text: 'Todavía no tenemos la confirmación del pago. Puede tardar unos minutos.', Icon: Clock },
  failed: { title: 'El pago no se completó', text: 'No se hizo ningún cobro. Podés intentarlo de nuevo.', Icon: CircleAlert },
  canceled: { title: 'El pedido venció', text: 'Pasó el plazo para pagarlo y liberamos las galletas. Podés hacer un pedido nuevo.', Icon: CircleAlert },
  refunded: { title: 'Pago devuelto', text: 'Este pago fue devuelto.', Icon: CircleAlert },
  paid_after_cancel: { title: 'Estamos revisando tu pago', text: 'Tu pago llegó después de que venciera el pedido. Te vamos a contactar para resolverlo.', Icon: Clock },
}

/** Sin acceso al pedido (por ejemplo, otro navegador) no se afirma ningún resultado. */
const UNKNOWN: Record<ReturnKind, Message> = {
  exitoso: { title: 'Volviste de Mercado Pago', text: 'Si el pago se aprobó, lo vas a ver en tu pedido en unos minutos.', Icon: Clock },
  pendiente: { title: 'Volviste de Mercado Pago', text: 'Si el pago quedó pendiente, se va a actualizar cuando se confirme.', Icon: Clock },
  fallido: { title: 'El pago no se completó', text: 'Si querés, podés intentarlo de nuevo desde tu pedido.', Icon: CircleAlert },
}

const parseOrderId = (reference: string | null): number | null => {
  const match = reference ? /^order-(\d+)$/.exec(reference) : null
  return match ? Number(match[1]) : null
}

/** /pago/exitoso, /pago/pendiente y /pago/fallido. El estado siempre lo define el servidor. */
export default function PaymentResult({ kind }: { kind: ReturnKind }) {
  const [params] = useSearchParams()
  const loggedIn = useAuthStore((s) => s.token !== null)
  const orderId = parseOrderId(params.get('external_reference'))
  const paymentId = params.get('payment_id') ?? undefined
  const openAuth = useAuthModalStore((s) => s.open)
  const [accessToken, setAccessToken] = useState(() => {
    const placed = readPlacedOrder()
    return placed?.id === orderId ? placed.accessToken : null
  })
  const [claimNotice, setClaimNotice] = useState('')

  // Si el invitado crea una cuenta o inicia sesión acá, se vincula este pedido, con su token.
  const claimingRef = useRef(false)
  useEffect(() => {
    if (!loggedIn || !accessToken || orderId === null || claimingRef.current) return
    claimingRef.current = true
    claimGuestOrder(orderId, accessToken)
      .then(() => setClaimNotice('Guardamos este pedido en tu cuenta.'))
      .catch(() => setClaimNotice('No pudimos guardar este pedido en tu cuenta, pero el pedido está registrado.'))
      .finally(() => {
        setAccessToken(null)
        writePlacedOrder({ id: orderId, accessToken: null })
      })
  }, [loggedIn, accessToken, orderId])
  const canAsk = orderId !== null && (loggedIn || accessToken !== null)

  const { state, retry } = useResource(canAsk ? `pago-${orderId}-${paymentId ?? ''}` : null, (signal) =>
    fetchPaymentState(orderId ?? 0, accessToken, paymentId, signal),
  )

  const payment = state.status === 'ready' ? state.data : null
  const message = (payment && BY_STATUS[payment.paymentStatus]) ?? UNKNOWN[kind]
  const loading = state.status === 'loading'

  usePageMeta(message.title, 'El estado de tu pago en Antua.')

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      {loading ? (
        <>
          <p role="status" className="sr-only">
            Consultando el estado de tu pago…
          </p>
          <div aria-hidden="true" className="flex flex-col items-center gap-4">
            <div className={`h-10 w-3/4 ${skeletonBar}`} />
            <div className={`h-5 w-full ${skeletonBar}`} />
          </div>
        </>
      ) : (
        <div aria-live="polite" className="flex flex-col items-center">
          <message.Icon aria-hidden="true" className="size-14 text-accent-main dark:text-dark-accent-main" />
          <h1 className="mt-4 font-display text-4xl font-bold">{message.title}</h1>
          <p className="mt-3 text-lg text-text-main/85 dark:text-dark-text-secondary">{message.text}</p>
          {orderId !== null && payment && <p className="mt-2 font-bold tabular-nums">Pedido #{orderId}</p>}
          {claimNotice && <p className="mt-2 font-bold">{claimNotice}</p>}
          <div className="mt-8 flex flex-wrap items-start justify-center gap-3">
            {payment?.canPay && payment.paymentStatus === 'failed' && orderId !== null && <RetryPaymentButton orderId={orderId} accessToken={accessToken} />}
            {payment?.paymentStatus === 'pending' && (
              <Button variant="secondary" onClick={retry}>
                Actualizar estado
              </Button>
            )}
            {!loggedIn && accessToken && (
              <Button variant="secondary" onClick={(event) => openAuth('register', event.currentTarget)}>
                <UserPlus aria-hidden="true" className="size-4" />
                Crear cuenta y guardar el pedido
              </Button>
            )}
            {loggedIn && orderId !== null ? (
              <ButtonLink to={`/cuenta/pedidos/${orderId}`} variant="secondary">
                Ver mi pedido
              </ButtonLink>
            ) : (
              <ButtonLink to="/tienda" variant="secondary">
                Seguir comprando
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

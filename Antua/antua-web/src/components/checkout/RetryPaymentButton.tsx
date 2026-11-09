import { useState } from 'react'
import { retryPayment } from '../../api/payments'
import { getApiErrorMessage } from '../../api/client'
import { Button } from '../ui/Button'

interface RetryPaymentButtonProps {
  orderId: number
  /** Solo invitados; con sesión, alcanza el JWT. */
  accessToken: string | null
}

/** Nuevo intento de pago: pide otro checkout al servidor y redirige a Mercado Pago. */
export function RetryPaymentButton({ orderId, accessToken }: RetryPaymentButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const retry = async () => {
    setPending(true)
    setError(null)
    try {
      window.location.assign(await retryPayment(orderId, accessToken))
    } catch (requestError) {
      setPending(false)
      setError(getApiErrorMessage(requestError, 'No pudimos iniciar el pago. Probá de nuevo en un rato.'))
    }
  }

  return (
    <div>
      <Button loading={pending} onClick={() => void retry()}>
        {pending ? 'Te llevamos al pago…' : 'Reintentar el pago'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-accent-main dark:text-dark-accent-main">
          {error}
        </p>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { CHECKOUT_STEPS, type CheckoutStep } from '../../lib/checkoutForm'

interface CheckoutStepsProps {
  current: CheckoutStep
  /** Último paso al que se puede volver (los anteriores ya se completaron). */
  reachable: CheckoutStep
  /** Con el pedido creado, ya no se puede volver a los pasos anteriores. */
  locked?: boolean
}

/** Barra de pasos (DESIGN.md §4, Checkout). Los pasos completados son links (?paso=n), así funciona Atrás. */
export function CheckoutSteps({ current, reachable, locked = false }: CheckoutStepsProps) {
  return (
    <nav aria-label="Pasos del checkout">
      <ol className="grid grid-cols-4 gap-2">
        {CHECKOUT_STEPS.map((label, index) => {
          const step = (index + 1) as CheckoutStep
          const done = step < current
          const isCurrent = step === current
          const canGo = !locked && !isCurrent && step <= reachable
          const marker = (
            <>
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                  isCurrent || done
                    ? 'bg-accent-main text-bg dark:bg-dark-accent-main dark:text-dark-bg'
                    : 'border-2 border-text-main/40 dark:border-dark-text-secondary/60'
                }`}
              >
                {done ? <Check className="size-4" /> : step}
              </span>
              <span className={`text-xs sm:text-sm ${isCurrent ? 'font-bold' : ''}`}>
                <span className="sr-only">Paso {step}: </span>
                {label}
                {done && <span className="sr-only"> (completado)</span>}
              </span>
            </>
          )
          const base = 'flex flex-col items-center gap-1.5 rounded-xl p-1 text-center sm:flex-row sm:text-left'
          return (
            <li key={label} aria-current={isCurrent ? 'step' : undefined} className="relative">
              {/* Línea de progreso bajo cada paso. */}
              <span
                aria-hidden="true"
                className={`mb-2 block h-1 rounded-full ${
                  step <= current ? 'bg-accent-main dark:bg-dark-accent-main' : 'bg-text-main/15 dark:bg-dark-text-main/15'
                }`}
              />
              {canGo ? (
                <Link
                  to={`?paso=${step}`}
                  className={`${base} underline-offset-4 transition-[background-color] duration-200 ease-out hover:bg-accent-secondary hover:underline dark:hover:bg-dark-card`}
                >
                  {marker}
                </Link>
              ) : (
                <div className={base}>{marker}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

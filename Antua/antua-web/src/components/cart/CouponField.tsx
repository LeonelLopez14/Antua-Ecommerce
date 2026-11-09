import { useId, useState, type FormEvent } from 'react'
import { TicketPercent, X } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import { couponErrorMessage } from '../../lib/cartMessages'
import { Button } from '../ui/Button'
import { iconButtonClasses } from '../ui/buttonStyles'

interface CouponFieldProps {
  appliedCode: string | null
}

/** Campo de cupón con borde punteado (wireframe del carrito). El descuento lo calcula el backend. */
export function CouponField({ appliedCode }: CouponFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const applyCoupon = useCartStore((s) => s.applyCoupon)
  const removeCoupon = useCartStore((s) => s.removeCoupon)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'apply' | 'remove' | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Escribí el código del cupón.')
      document.getElementById(id)?.focus()
      return
    }
    setPending('apply')
    setError(null)
    const result = await applyCoupon(trimmed)
    setPending(null)
    if (result.ok) setCode('')
    else {
      setError(couponErrorMessage(result.error))
      document.getElementById(id)?.focus()
    }
  }

  const remove = async () => {
    setPending('remove')
    setError(null)
    const result = await removeCoupon()
    setPending(null)
    if (!result.ok) setError(result.error)
  }

  if (appliedCode) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-accent-tertiary px-4 py-3 dark:border-dark-text-secondary/60">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <TicketPercent aria-hidden="true" className="size-4 shrink-0 text-accent-main dark:text-dark-accent-main" />
            <span className="truncate">
              Cupón <strong translate="no">{appliedCode}</strong> aplicado
            </span>
          </p>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={pending === 'remove'}
            aria-label={`Quitar cupón ${appliedCode}`}
            className={iconButtonClasses()}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-bold text-accent-main dark:text-dark-accent-main">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="rounded-xl border-2 border-dashed border-accent-tertiary p-3 dark:border-dark-text-secondary/60">
      <label htmlFor={id} className="text-sm font-bold">
        ¿Tenés un cupón?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          name="cupon"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Ej.: BIENVENIDA10…"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-xl border border-text-main/40 bg-bg px-3 py-2.5 text-base uppercase placeholder:normal-case placeholder:text-text-main/50 dark:border-dark-text-secondary/60 dark:bg-dark-bg dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70"
        />
        <Button type="submit" variant="secondary" loading={pending === 'apply'} className="shrink-0 px-5">
          Aplicar
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-bold text-accent-main dark:text-dark-accent-main">
          {error}
        </p>
      )}
    </form>
  )
}

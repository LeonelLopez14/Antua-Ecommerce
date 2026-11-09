import { useId, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  /** Nombre accesible del grupo, ej.: "Cantidad de Clásica con chips". */
  label?: string
  disabled?: boolean
  size?: 'md' | 'sm'
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n))

/** Stepper − / campo / +. Agrupa el foco con :focus-within (DESIGN.md §11). Se usa en la ficha y en el carrito. */
export function QuantityStepper({ value, onChange, min = 1, max, label = 'Cantidad', disabled = false, size = 'md' }: QuantityStepperProps) {
  const id = useId()
  // Texto mientras se escribe; se valida al salir del campo o con Enter.
  const [draft, setDraft] = useState<string | null>(null)
  const upper = Math.max(min, max)

  const commit = () => {
    if (draft === null) return
    const n = Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isFinite(n)) {
      const next = clamp(n, min, upper)
      if (next !== value) onChange(next)
    }
  }

  const button =
    `inline-flex ${size === 'md' ? 'size-11' : 'size-9'} shrink-0 items-center justify-center rounded-full ` +
    'transition-[background-color] duration-200 ease-out hover:bg-accent-secondary disabled:opacity-40 disabled:hover:bg-transparent ' +
    'dark:hover:bg-dark-card'

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-text-main/40 bg-bg p-1 focus-within:border-accent-main dark:border-dark-text-secondary/60 dark:bg-dark-bg dark:focus-within:border-dark-accent-main"
    >
      <button
        type="button"
        aria-label="Restar una"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1, min, upper))}
        className={button}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name="cantidad"
        type="number"
        inputMode="numeric"
        autoComplete="off"
        min={min}
        max={upper}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        className={`${size === 'md' ? 'w-12 text-base' : 'w-9 text-sm'} [appearance:textfield] bg-transparent text-center font-bold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button
        type="button"
        aria-label="Sumar una"
        disabled={disabled || value >= upper}
        onClick={() => onChange(clamp(value + 1, min, upper))}
        className={button}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

import { useId, useState } from 'react'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { formatPrice } from '../../lib/format'

interface PriceRangeFilterProps {
  min: number | null
  max: number | null
  /** Rango real de precios de la tienda, para la ayuda bajo los campos. */
  bounds: { min: number; max: number } | null
  onChange: (min: number | null, max: number | null) => void
}

const DEBOUNCE_MS = 500

const toInput = (value: number | null): string => (value === null ? '' : String(value))
const toValue = (input: string): number | null => {
  if (input.trim() === '') return null
  const n = Number(input)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

const inputClass =
  'w-full min-w-0 rounded-xl border border-text-main/40 bg-bg px-3 py-2.5 text-base tabular-nums text-text-main ' +
  'placeholder:text-text-main/50 dark:border-dark-text-secondary/60 dark:bg-dark-bg dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70'

export function PriceRangeFilter({ min, max, bounds, onChange }: PriceRangeFilterProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const [minInput, setMinInput] = useState(toInput(min))
  const [maxInput, setMaxInput] = useState(toInput(max))

  // Si la URL cambia desde afuera (Limpiar filtros, atrás/adelante), los campos se resincronizan.
  const [synced, setSynced] = useState({ min, max })
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max })
    if (toValue(minInput) !== min) setMinInput(toInput(min))
    if (toValue(maxInput) !== max) setMaxInput(toInput(max))
  }

  const minValue = toValue(minInput)
  const maxValue = toValue(maxInput)
  const invalid = minValue !== null && maxValue !== null && minValue > maxValue

  const commit = useDebouncedCallback((nextMin: string, nextMax: string) => {
    const a = toValue(nextMin)
    const b = toValue(nextMax)
    if (a !== null && b !== null && a > b) return
    onChange(a, b)
  }, DEBOUNCE_MS)

  return (
    <fieldset>
      <legend className="font-display text-lg font-semibold">Precio</legend>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor={`${id}-min`} className="text-sm font-bold">
            Mínimo
          </label>
          <input
            id={`${id}-min`}
            name="precio-min"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            autoComplete="off"
            placeholder={bounds ? `${bounds.min}…` : 'Ej.: 2000…'}
            value={minInput}
            aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setMinInput(e.target.value)
              commit(e.target.value, maxInput)
            }}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${id}-max`} className="text-sm font-bold">
            Máximo
          </label>
          <input
            id={`${id}-max`}
            name="precio-max"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            autoComplete="off"
            placeholder={bounds ? `${bounds.max}…` : 'Ej.: 5000…'}
            value={maxInput}
            aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setMaxInput(e.target.value)
              commit(minInput, e.target.value)
            }}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>
      {bounds && (
        <p id={hintId} className="mt-2 text-sm text-text-main/75 dark:text-dark-text-secondary">
          Hay galletas entre {formatPrice(bounds.min)} y {formatPrice(bounds.max)}.
        </p>
      )}
      {invalid && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-bold text-accent-main dark:text-dark-accent-main">
          El mínimo tiene que ser menor que el máximo.
        </p>
      )}
    </fieldset>
  )
}

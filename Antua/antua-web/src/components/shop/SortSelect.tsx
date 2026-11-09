import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { SORT_OPTIONS, type SortKey } from '../../lib/shopQuery'

interface SortSelectProps {
  value: SortKey
  onChange: (value: SortKey) => void
}

const isSortKey = (value: string): value is SortKey => SORT_OPTIONS.some((o) => o.value === value)

export function SortSelect({ value, onChange }: SortSelectProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-sm font-bold">
        Ordenar por
      </label>
      <div className="relative">
        {/* Fondo y color explícitos: el <select> nativo no hereda bien el modo oscuro en Windows. */}
        <select
          id={id}
          name="orden"
          value={value}
          onChange={(e) => {
            if (isSortKey(e.target.value)) onChange(e.target.value)
          }}
          className="min-h-11 appearance-none rounded-full border border-text-main/40 bg-bg py-2 pr-10 pl-4 text-sm font-bold text-text-main dark:border-dark-text-secondary/60 dark:bg-dark-card dark:text-dark-text-main"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
      </div>
    </div>
  )
}

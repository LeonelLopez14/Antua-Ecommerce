import { useState } from 'react'
import { Search } from 'lucide-react'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'

interface SearchFieldProps {
  id: string
  label: string
  value: string
  placeholder: string
  onSearch: (value: string) => void
}

/** Búsqueda que actualiza la URL 300 ms después de dejar de escribir (Enter la aplica en el acto). */
export function SearchField({ id, label, value, placeholder, onSearch }: SearchFieldProps) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  // Si la URL cambió desde afuera (ej.: "Limpiar filtros"), el campo la sigue.
  if (synced !== value) {
    setSynced(value)
    setDraft(value)
  }
  const debounced = useDebouncedCallback(onSearch, 300)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(draft.trim())
      }}
    >
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <div className="relative mt-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-70" />
        <input
          id={id}
          type="search"
          name="q"
          value={draft}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value)
            debounced(event.target.value.trim())
          }}
          className="min-h-11 w-full rounded-xl border border-border-control bg-bg py-2.5 pr-3 pl-9 text-base text-text-main placeholder:text-text-main/50 dark:border-dark-border-control dark:bg-dark-bg dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70"
        />
      </div>
    </form>
  )
}

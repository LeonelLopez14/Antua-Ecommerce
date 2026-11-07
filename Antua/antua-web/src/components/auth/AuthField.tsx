import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  /** Contenido a la derecha del label (ej.: "¿Olvidaste tu contraseña?"). */
  aside?: ReactNode
  /** Texto de ayuda bajo el campo (se oculta si hay error). */
  hint?: string
  ref?: Ref<HTMLInputElement>
}

/** Campo de formulario (DESIGN.md §4: inputs de 12 px de radio sobre bg). Error en línea, ligado con aria-describedby. */
export function AuthField({ id, label, error, aside, hint, ref, className = '', ...props }: AuthFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
        </label>
        {aside}
      </div>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1 w-full rounded-xl border bg-bg px-3 py-2.5 text-base text-text-main placeholder:text-text-main/50 dark:bg-dark-bg dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70 ${
          error ? 'border-accent-main dark:border-dark-accent-main' : 'border-text-main/40 dark:border-dark-text-secondary/60'
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-text-main/75 dark:text-dark-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-bold text-accent-main dark:text-dark-accent-main">
          {error}
        </p>
      )}
    </div>
  )
}

import type { ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const control = (error?: string) =>
  `mt-1 w-full rounded-xl border bg-bg px-3 py-2.5 text-base text-text-main placeholder:text-text-main/50 dark:bg-dark-bg dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70 ${
    error ? 'border-accent-main dark:border-dark-accent-main' : 'border-text-main/40 dark:border-dark-text-secondary/60'
  }`

function Feedback({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="mt-1.5 text-sm font-bold text-accent-main dark:text-dark-accent-main">
        {error}
      </p>
    )
  }
  return hint ? (
    <p id={`${id}-hint`} className="mt-1.5 text-sm text-text-main/75 dark:text-dark-text-secondary">
      {hint}
    </p>
  ) : null
}

const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  label: string
  error?: string
  hint?: string
  ref?: Ref<HTMLTextAreaElement>
}

/** Como FormField, pero multilínea. */
export function TextAreaField({ id, label, error, hint, ref, rows = 4, ...props }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control(error)} resize-y`}
        {...props}
      />
      <Feedback id={id} error={error} hint={hint} />
    </div>
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
  ref?: Ref<HTMLSelectElement>
}

/** Select nativo con fondo y color explícitos (DESIGN.md §11: modo oscuro en Windows). */
export function SelectField({ id, label, error, hint, children, ref, ...props }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control(error)} min-h-11`}
        {...props}
      >
        {children}
      </select>
      <Feedback id={id} error={error} hint={hint} />
    </div>
  )
}

interface CheckboxFieldProps {
  id: string
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
  name?: string
  disabled?: boolean
}

/** Checkbox con una sola zona de clic (label y control juntos, 44 px de alto). */
export function CheckboxField({ id, label, checked, onChange, hint, name, disabled }: CheckboxFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center gap-3 font-bold">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="size-5 shrink-0 accent-accent-main dark:accent-dark-accent-main"
        />
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-text-main/75 dark:text-dark-text-secondary">
          {hint}
        </p>
      )}
    </div>
  )
}

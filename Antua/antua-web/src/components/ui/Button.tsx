import type { ButtonHTMLAttributes, Ref } from 'react'
import { LoaderCircle } from 'lucide-react'
import { buttonClasses, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Request en curso: muestra spinner y evita doble envío sin deshabilitar antes de tiempo. */
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', loading = false, className = '', type = 'button', children, onClick, ref, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={buttonClasses(variant, className)}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
      {children}
    </button>
  )
}

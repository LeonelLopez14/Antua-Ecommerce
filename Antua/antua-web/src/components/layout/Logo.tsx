import { Link, type LinkProps } from 'react-router-dom'
import { Cookie } from 'lucide-react'

type LogoProps = Omit<LinkProps, 'to' | 'children'>

/** Marca con link a la Home. `translate="no"` evita que el traductor la cambie (DESIGN.md §11). */
export function Logo({ className = '', ...props }: LogoProps) {
  return (
    <Link
      to="/"
      translate="no"
      className={`flex items-center gap-2 rounded-full font-display text-2xl font-bold text-text-main dark:text-dark-text-main ${className}`}
      {...props}
    >
      <Cookie aria-hidden="true" className="size-7 text-accent-main dark:text-dark-accent-main" />
      Antua
    </Link>
  )
}

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
      {/* Debajo de 360 px el ícono se oculta: con "Antojarte" y los cuatro botones de 44 px, la
          Navbar desbordaría 32 px a 320 px (WCAG 1.4.10). */}
      <Cookie aria-hidden="true" className="hidden size-7 text-accent-main min-[360px]:block dark:text-dark-accent-main" />
      Antojarte
    </Link>
  )
}

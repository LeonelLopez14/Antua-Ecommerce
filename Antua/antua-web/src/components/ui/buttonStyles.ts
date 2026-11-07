export type ButtonVariant = 'primary' | 'secondary'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 font-bold leading-none ' +
  'transition-[transform,box-shadow,background-color,color] duration-200 ease-out ' +
  'hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0 ' +
  'disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-main text-bg hover:bg-accent-main/90 dark:bg-dark-accent-main dark:text-dark-bg dark:hover:bg-dark-accent-main/90',
  // DESIGN.md §2: el borde accent-tertiary no llega a 3:1, por eso el texto va en text-main.
  secondary:
    'border-2 border-accent-tertiary text-text-main hover:bg-accent-secondary dark:border-dark-text-secondary dark:text-dark-text-main dark:hover:bg-dark-card',
}

/** Clases de botón pill (DESIGN.md §4). Compartidas por Button (acciones) y ButtonLink (navegación). */
export const buttonClasses = (variant: ButtonVariant = 'primary', className = ''): string =>
  `${base} ${variants[variant]} ${className}`

/**
 * Botón circular de 44 px solo con ícono (cerrar, quitar, cuenta, carrito).
 * `onTint`: el botón va sobre un fondo accent-secondary, así que el hover usa bg.
 */
export const iconButtonClasses = (onTint = false): string =>
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full ' +
  'transition-[background-color] duration-200 ease-out disabled:opacity-40 ' +
  (onTint ? 'hover:bg-bg dark:hover:bg-dark-bg' : 'hover:bg-accent-secondary dark:hover:bg-dark-card')

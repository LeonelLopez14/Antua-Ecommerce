import type { ReactNode } from 'react'

/** Badge de ingrediente/categoría (DESIGN.md §4: accent-tertiary con texto text-main). */
export function TagBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-accent-tertiary px-3 py-1 text-xs leading-none font-bold text-text-main dark:bg-dark-bg dark:text-dark-accent-main">
      {children}
    </span>
  )
}

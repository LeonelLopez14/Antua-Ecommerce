import type { ReactNode } from 'react'
import { CookieFallback } from '../../three/cookie/CookieFallback'

interface EmptyStateProps {
  title: string
  /** Nivel del título según dónde se use (por defecto h3, dentro de una sección con h2). */
  headingLevel?: 2 | 3
  message?: string
  action?: ReactNode
}

export function EmptyState({ title, message, action, headingLevel = 3 }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className="flex flex-col items-center rounded-card bg-bg px-6 py-12 text-center dark:bg-dark-card">
      <CookieFallback className="size-24 opacity-70" />
      <Heading className="mt-4 font-display text-2xl font-semibold">{title}</Heading>
      {message && <p className="mt-2 max-w-md text-text-main/85 dark:text-dark-text-secondary">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

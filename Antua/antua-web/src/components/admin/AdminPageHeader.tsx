import type { ReactNode } from 'react'

interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Link de vuelta (ej.: "← Productos"). */
  back?: ReactNode
}

export function AdminPageHeader({ title, description, actions, back }: AdminPageHeaderProps) {
  return (
    <header className="mb-6">
      {back && <div className="mb-2">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold break-words">{title}</h1>
          {description && <p className="mt-1 text-text-main/80 dark:text-dark-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}

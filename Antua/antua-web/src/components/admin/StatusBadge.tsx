import { CircleCheck, CircleDot, CircleX, LoaderCircle, TriangleAlert, type LucideIcon } from 'lucide-react'

export type BadgeTone = 'neutral' | 'progress' | 'done' | 'muted' | 'warning'

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-accent-secondary text-text-main',
  progress: 'bg-accent-tertiary text-text-main',
  done: 'bg-accent-main text-bg',
  muted: 'bg-text-main/10 text-text-main',
  warning: 'border border-accent-main bg-accent-secondary text-text-main',
}

const TONE_ICON: Record<BadgeTone, LucideIcon> = {
  neutral: CircleDot,
  progress: LoaderCircle,
  done: CircleCheck,
  muted: CircleX,
  warning: TriangleAlert,
}

interface StatusBadgeProps {
  label: string
  tone: BadgeTone
}

/**
 * Badge de estado del panel (pill, DESIGN.md §4). Ícono + texto: el estado no depende del color.
 * En oscuro, acento sobre fondo (DESIGN.md §2 no define acentos secundarios oscuros).
 */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const Icon = TONE_ICON[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${TONE_CLASS[tone]} dark:border-dark-accent-main dark:bg-dark-bg dark:text-dark-accent-main`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}

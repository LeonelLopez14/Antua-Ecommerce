import { CircleCheck, CircleDot, CircleX, Truck } from 'lucide-react'
import { orderStatusInfo } from '../../lib/orderMessages'

const TONE_CLASS = {
  neutral: 'bg-accent-secondary text-text-main',
  progress: 'bg-accent-tertiary text-text-main',
  done: 'bg-accent-main text-bg',
  muted: 'bg-text-main/10 text-text-main',
} as const

const TONE_ICON = {
  neutral: CircleDot,
  progress: Truck,
  done: CircleCheck,
  muted: CircleX,
} as const

/**
 * Badge del estado del pedido (pill, DESIGN.md §4). El ícono y el texto distinguen el estado,
 * no solo el color. En oscuro, acento sobre card (DESIGN.md §2, sin acentos secundarios definidos).
 */
export function OrderStatusBadge({ status }: { status: string }) {
  const { label, tone } = orderStatusInfo(status)
  const Icon = TONE_ICON[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${TONE_CLASS[tone]} dark:bg-dark-bg dark:text-dark-accent-main`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}

import { Info } from 'lucide-react'
import { cartWarningMessage } from '../../lib/cartMessages'
import { useCartStore } from '../../stores/cartStore'

/**
 * Avisos del backend sobre el carrito (por ejemplo, un cupón retirado). La región queda
 * siempre montada, porque aria-live solo anuncia cambios dentro de una región que ya existe.
 */
export function CartWarnings({ className = '' }: { className?: string }) {
  const warnings = useCartStore((s) => s.warnings)

  return (
    <div aria-live="polite" className={warnings.length > 0 ? className : ''}>
      {warnings.map((warning) => (
        <p
          key={warning.code}
          className="flex items-start gap-2 rounded-xl bg-accent-tertiary px-4 py-3 text-sm text-text-main dark:bg-dark-card dark:text-dark-text-main"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{cartWarningMessage(warning)}</span>
        </p>
      ))}
    </div>
  )
}

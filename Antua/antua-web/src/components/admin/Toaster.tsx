import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useToastStore } from '../../stores/toastStore'
import { iconButtonClasses } from '../ui/buttonStyles'

/**
 * Región aria-live siempre montada (si se montara con el mensaje, algunos lectores no lo leen).
 * Sin `display: contents`: algunos lectores sacan esos elementos del árbol de accesibilidad.
 * Los errores usan role="alert" (assertive); los éxitos, polite.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96 pb-[env(safe-area-inset-bottom)]">
      <div aria-live="polite" className="flex w-full flex-col items-end gap-2">
        {toasts
          .filter((t) => t.tone === 'success')
          .map((t) => (
            <ToastCard key={t.id} message={t.message} tone="success" onDismiss={() => dismiss(t.id)} />
          ))}
      </div>
      <div role="alert" className="flex w-full flex-col items-end gap-2">
        {toasts
          .filter((t) => t.tone === 'error')
          .map((t) => (
            <ToastCard key={t.id} message={t.message} tone="error" onDismiss={() => dismiss(t.id)} />
          ))}
      </div>
    </div>
  )
}

function ToastCard({ message, tone, onDismiss }: { message: string; tone: 'success' | 'error'; onDismiss: () => void }) {
  const Icon = tone === 'success' ? CircleCheck : CircleAlert
  return (
    <div className="pointer-events-auto flex w-full items-start gap-3 rounded-card bg-surface p-4 shadow-lift dark:bg-dark-card dark:shadow-dark-float">
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
      <p className="min-w-0 flex-1 break-words text-sm font-bold">{message}</p>
      <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className={`${iconButtonClasses()} -m-2`}>
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

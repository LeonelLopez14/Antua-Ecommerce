import type { ReactNode } from 'react'
import { Dialog } from './Dialog'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** Request en curso (ej.: borrando): spinner en el botón de confirmar. */
  pending?: boolean
  /** La acción segura va primero (ej.: "Seguir con mi pedido"); la de confirmar, como secundaria. */
  safeFirst?: boolean
}

/** Confirmación de una acción (DESIGN.md §11: las acciones destructivas piden confirmación). */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel, onConfirm, onCancel, pending = false, safeFirst = false }: ConfirmDialogProps) {
  const confirm = (
    <Button key="confirm" variant={safeFirst ? 'secondary' : 'primary'} loading={pending} onClick={onConfirm}>
      {confirmLabel}
    </Button>
  )
  const cancel = (
    <Button key="cancel" variant={safeFirst ? 'primary' : 'secondary'} onClick={onCancel}>
      {cancelLabel}
    </Button>
  )
  return (
    <Dialog open={open} onClose={onCancel} title={title} placement="center">
      <div>{children}</div>
      <div className="mt-6 flex flex-wrap gap-3">{safeFirst ? [cancel, confirm] : [confirm, cancel]}</div>
    </Dialog>
  )
}

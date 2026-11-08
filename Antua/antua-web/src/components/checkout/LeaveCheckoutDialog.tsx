import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

interface LeaveCheckoutDialogProps {
  open: boolean
  onStay: () => void
  onLeave: () => void
}

/** Aviso antes de salir del checkout con datos sin guardar (DESIGN.md §11, Formularios). */
export function LeaveCheckoutDialog({ open, onStay, onLeave }: LeaveCheckoutDialogProps) {
  return (
    <Dialog open={open} onClose={onStay} title="¿Salís del checkout?" placement="center">
      <p>Los datos que escribiste no se guardan. Tu carrito sí queda como está.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onStay}>Seguir con mi pedido</Button>
        <Button variant="secondary" onClick={onLeave}>
          Salir
        </Button>
      </div>
    </Dialog>
  )
}

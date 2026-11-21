import type { Blocker } from 'react-router-dom'
import { ConfirmDialog } from './ConfirmDialog'

/** Diálogo del useUnsavedChanges: la acción segura (seguir editando) va primero. */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Tenés cambios sin guardar"
      confirmLabel="Salir sin guardar"
      cancelLabel="Seguir editando"
      safeFirst
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    >
      <p>Si salís ahora, se pierden los cambios de este formulario.</p>
    </ConfirmDialog>
  )
}

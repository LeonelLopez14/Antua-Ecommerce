import { useState } from 'react'
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress, updateAddress } from '../../api/addresses'
import { getApiErrorMessage } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { useResource } from '../../hooks/useResource'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { addressFormToPayload, addressToForm, emptyAddressForm, type AddressForm } from '../../lib/addressForm'
import type { Address } from '../../types/address'
import { AddressFormDialog } from '../../components/account/AddressFormDialog'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { skeletonBar } from '../../components/ui/skeleton'

/** Con una predeterminada nueva, el backend desmarca las demás: se refleja igual en la lista. */
const withDefault = (list: Address[], saved: Address): Address[] =>
  list.map((a) => (a.id === saved.id ? saved : saved.is_default ? { ...a, is_default: false } : a))

/** La predeterminada primero, como la ordena GET /addresses. */
const sortAddresses = (list: Address[]): Address[] => [...list].sort((a, b) => Number(b.is_default) - Number(a.is_default))

const addressName = (a: Address): string => a.label ?? a.street

type Editing = { mode: 'new' } | { mode: 'edit'; address: Address }

/** Direcciones guardadas: alta, edición, borrado con confirmación y predeterminada (todo lo que expone /addresses). */
export default function Addresses() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const { state, retry, setData } = useResource(`direcciones-${userId ?? ''}`, fetchAddresses)
  const [editing, setEditing] = useState<Editing>({ mode: 'new' })
  const [formOpen, setFormOpen] = useState(false)
  const [formInstance, setFormInstance] = useState(0)
  // La dirección a borrar se conserva al cerrar, para que el diálogo no se vacíe durante la animación de salida.
  const [toDelete, setToDelete] = useState<Address | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingDefault, setPendingDefault] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useDocumentTitle('Mis direcciones')

  const addresses = state.status === 'ready' ? state.data : []

  const openForm = (next: Editing) => {
    setActionError(null)
    setFormInstance((n) => n + 1)
    setEditing(next)
    setFormOpen(true)
  }

  const save = async (form: AddressForm): Promise<string | null> => {
    try {
      const payload = addressFormToPayload(form)
      if (editing.mode === 'new') {
        const created = await createAddress(payload)
        setData((list) => sortAddresses(withDefault([...list, created], created)))
        setAnnouncement(`Guardamos la dirección ${addressName(created)}.`)
      } else {
        const updated = await updateAddress(editing.address.id, payload)
        setData((list) => sortAddresses(withDefault(list, updated)))
        setAnnouncement(`Actualizamos la dirección ${addressName(updated)}.`)
      }
      setFormOpen(false)
      return null
    } catch (error) {
      return getApiErrorMessage(error, 'No pudimos guardar la dirección. Probá de nuevo en un rato.')
    }
  }

  const makeDefault = async (address: Address) => {
    setActionError(null)
    setPendingDefault(address.id)
    try {
      const updated = await setDefaultAddress(address.id)
      setData((list) => sortAddresses(withDefault(list, { ...updated, is_default: true })))
      setAnnouncement(`${addressName(address)} es ahora tu dirección predeterminada.`)
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No pudimos cambiar la predeterminada. Probá de nuevo.'))
    } finally {
      setPendingDefault(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteAddress(toDelete.id)
      setData((list) => list.filter((a) => a.id !== toDelete.id))
      setAnnouncement(`Borramos la dirección ${addressName(toDelete)}.`)
      setDeleteOpen(false)
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No pudimos borrar la dirección. Probá de nuevo.'))
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section aria-labelledby="direcciones-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="direcciones-title" className="font-display text-3xl font-semibold">
          Direcciones
        </h2>
        {state.status === 'ready' && addresses.length > 0 && (
          <Button onClick={() => openForm({ mode: 'new' })}>
            <Plus aria-hidden="true" className="size-4" />
            Agregar dirección
          </Button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {actionError && (
        <p role="alert" className="mt-4 font-bold text-accent-main dark:text-dark-accent-main">
          {actionError}
        </p>
      )}

      <div className="mt-6">
        {(state.status === 'loading' || state.status === 'idle') && (
          <>
            <p role="status" className="sr-only">
              Cargando tus direcciones…
            </p>
            <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="flex flex-col gap-3 rounded-card bg-surface p-6 dark:bg-dark-card">
                  <div className={`h-5 w-24 ${skeletonBar}`} />
                  <div className={`h-4 w-48 ${skeletonBar}`} />
                  <div className={`h-4 w-32 ${skeletonBar}`} />
                </div>
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && <ErrorState title="No pudimos traer tus direcciones" message={state.message} onRetry={retry} />}

        {state.status === 'ready' && addresses.length === 0 && (
          <EmptyState
            title="Todavía no guardaste direcciones"
            message="Guardá una y la vas a poder elegir en el checkout sin escribirla de nuevo."
            action={
              <Button onClick={() => openForm({ mode: 'new' })}>
                <Plus aria-hidden="true" className="size-4" />
                Agregar dirección
              </Button>
            }
          />
        )}

        {addresses.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="flex flex-col rounded-card bg-surface p-6 shadow-soft dark:bg-dark-card dark:shadow-none">
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin aria-hidden="true" className="size-5 text-accent-main dark:text-dark-accent-main" />
                  <h3 className="min-w-0 font-bold break-words">{address.label ?? 'Dirección'}</h3>
                  {address.is_default && (
                    <span className="rounded-full bg-accent-secondary px-3 py-1 text-xs font-bold text-text-main dark:bg-dark-bg dark:text-dark-accent-main">
                      Predeterminada
                    </span>
                  )}
                </div>
                <p className="mt-2 break-words">{address.street}</p>
                <p>
                  {address.city} ({address.postal_code}), {address.country}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" className="min-h-10 px-4 py-2 text-sm" onClick={() => openForm({ mode: 'edit', address })}>
                    <Pencil aria-hidden="true" className="size-4" />
                    Editar<span className="sr-only"> {addressName(address)}</span>
                  </Button>
                  {!address.is_default && (
                    <Button
                      variant="secondary"
                      className="min-h-10 px-4 py-2 text-sm"
                      loading={pendingDefault === address.id}
                      onClick={() => void makeDefault(address)}
                    >
                      <Star aria-hidden="true" className="size-4" />
                      Hacer predeterminada<span className="sr-only">: {addressName(address)}</span>
                    </Button>
                  )}
                  <Button variant="secondary" className="min-h-10 px-4 py-2 text-sm" onClick={() => {
                      setToDelete(address)
                      setDeleteOpen(true)
                    }}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    Borrar<span className="sr-only"> {addressName(address)}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddressFormDialog
        open={formOpen}
        instance={formInstance}
        title={editing.mode === 'edit' ? 'Editar dirección' : 'Nueva dirección'}
        initial={editing.mode === 'edit' ? addressToForm(editing.address) : emptyAddressForm(addresses.length === 0)}
        lockDefault={editing.mode === 'edit' && editing.address.is_default}
        onClose={() => setFormOpen(false)}
        onSubmit={save}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="¿Borrás esta dirección?"
        confirmLabel="Borrar dirección"
        cancelLabel="Cancelar"
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
      >
        {toDelete && (
          <p>
            Vas a borrar <strong className="break-words">{addressName(toDelete)}</strong>. Los pedidos que ya hiciste no cambian.
          </p>
        )}
      </ConfirmDialog>
    </section>
  )
}

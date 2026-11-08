import { useId, useState, type FormEvent } from 'react'
import {
  ADDRESS_FIELD_ORDER,
  ADDRESS_MAX_LENGTH,
  validateAddressForm,
  type AddressErrors,
  type AddressField,
  type AddressForm,
} from '../../lib/addressForm'
import { Dialog } from '../ui/Dialog'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'

interface AddressFormDialogProps {
  open: boolean
  /** Cambia en cada apertura: remonta el formulario (empieza limpio y no se vacía mientras se cierra). */
  instance: number
  /** Título del diálogo: "Nueva dirección" o "Editar dirección". */
  title: string
  initial: AddressForm
  /** Ya es la predeterminada: no se puede desmarcar desde acá (el backend no lo permite). */
  lockDefault: boolean
  onClose: () => void
  /** Devuelve el mensaje de error del backend, o null si se guardó. */
  onSubmit: (form: AddressForm) => Promise<string | null>
}

/** Alta y edición de direcciones. */
export function AddressFormDialog({ open, instance, title, initial, lockDefault, onClose, onSubmit }: AddressFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} placement="center">
      <AddressFormBody key={instance} initial={initial} lockDefault={lockDefault} onCancel={onClose} onSubmit={onSubmit} />
    </Dialog>
  )
}

interface BodyProps {
  initial: AddressForm
  lockDefault: boolean
  onCancel: () => void
  onSubmit: (form: AddressForm) => Promise<string | null>
}

function AddressFormBody({ initial, lockDefault, onCancel, onSubmit }: BodyProps) {
  const baseId = useId()
  const fieldId = (field: AddressField) => `${baseId}-${field}`
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const next = validateAddressForm(form)
    setErrors(next)
    const first = ADDRESS_FIELD_ORDER.find((f) => next[f])
    if (first) {
      document.getElementById(fieldId(first))?.focus()
      return
    }
    setPending(true)
    setFormError(null)
    const error = await onSubmit(form)
    setPending(false)
    if (error) setFormError(error)
  }

  const field = (name: AddressField, props: Omit<Parameters<typeof FormField>[0], 'id'>) => (
    <FormField
      id={fieldId(name)}
      name={name}
      value={form[name]}
      maxLength={ADDRESS_MAX_LENGTH[name]}
      error={errors[name]}
      onChange={(event) => {
        const value = event.target.value
        setForm((f) => ({ ...f, [name]: value }))
      }}
      {...props}
    />
  )

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {field('label', {
        label: 'Nombre (opcional)',
        autoComplete: 'off',
        placeholder: 'Casa, Trabajo…',
      })}
      {field('street', { label: 'Calle y número', autoComplete: 'street-address', placeholder: 'Av. Siempreviva 742, 3.º B…' })}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        {field('city', { label: 'Ciudad o localidad', autoComplete: 'address-level2', placeholder: 'CABA…' })}
        {field('postalCode', { label: 'Código postal', autoComplete: 'postal-code', spellCheck: false, placeholder: '1405…' })}
      </div>
      {field('country', { label: 'País', autoComplete: 'country-name' })}

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 has-disabled:cursor-default">
        <input
          type="checkbox"
          checked={form.isDefault}
          disabled={lockDefault}
          onChange={(event) => {
            const checked = event.target.checked
            setForm((f) => ({ ...f, isDefault: checked }))
          }}
          className="size-5 accent-accent-main dark:accent-dark-accent-main"
        />
        <span>
          Usar como predeterminada
          {lockDefault && <span className="block text-sm text-text-main/75 dark:text-dark-text-secondary">Ya es tu dirección predeterminada.</span>}
        </span>
      </label>

      {formError && (
        <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
          {formError}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        <Button type="submit" loading={pending}>
          Guardar dirección
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

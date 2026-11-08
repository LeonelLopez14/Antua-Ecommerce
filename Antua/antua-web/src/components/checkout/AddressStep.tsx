import { useId, useState, type FormEvent } from 'react'
import { MapPin } from 'lucide-react'
import {
  CHECKOUT_FIELD_ORDER,
  CHECKOUT_MAX_LENGTH,
  validateCheckoutForm,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutForm,
} from '../../lib/checkoutForm'
import type { Address } from '../../types/address'
import type { Resource } from '../../hooks/useResource'
import { useAuthModalStore } from '../../stores/authModalStore'
import { FormField } from '../ui/FormField'
import { Button } from '../ui/Button'
import { skeletonBar } from '../ui/skeleton'

/** Dirección guardada elegida, o 'new' para escribir otra. */
export type AddressChoice = number | 'new'

interface AddressStepProps {
  form: CheckoutForm
  onChange: (field: CheckoutField, value: string) => void
  isGuest: boolean
  /** Direcciones guardadas (solo con sesión). */
  addresses: Resource<Address[]>
  choice: AddressChoice
  /** `keepValues`: al pasar a 'new' se conservan los campos (para corregir una dirección guardada). */
  onChoose: (choice: AddressChoice, keepValues?: boolean) => void
  onContinue: () => void
}

const ADDRESS_FIELDS: CheckoutField[] = ['street', 'city', 'postalCode']

const addressLine = (a: Address): string => `${a.street}, ${a.city} (${a.postal_code})`

/**
 * Paso 1. Invitado: email, nombre, teléfono y dirección. Con sesión: además, sus direcciones
 * guardadas o "usar otra dirección". Nunca obliga a iniciar sesión (guest checkout).
 */
export function AddressStep({ form, onChange, isGuest, addresses, choice, onChoose, onContinue }: AddressStepProps) {
  const baseId = useId()
  const fieldId = (field: CheckoutField) => `${baseId}-${field}`
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const openAuth = useAuthModalStore((s) => s.open)

  const savedAddresses = addresses.status === 'ready' ? addresses.data : []
  const usingSaved = !isGuest && choice !== 'new'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = validateCheckoutForm(form, isGuest)
    setErrors(next)
    const first = CHECKOUT_FIELD_ORDER.find((field) => next[field])
    if (!first) {
      onContinue()
      return
    }
    // Si falla una dirección guardada (ej.: código postal viejo), se muestran sus campos para corregirla.
    if (usingSaved && ADDRESS_FIELDS.includes(first)) onChoose('new', true)
    // El campo puede montarse recién en este render: se enfoca en el siguiente frame.
    window.requestAnimationFrame(() => document.getElementById(fieldId(first))?.focus())
  }

  const field = (name: CheckoutField, props: Omit<Parameters<typeof FormField>[0], 'id'>) => (
    <FormField
      id={fieldId(name)}
      name={name}
      value={form[name]}
      maxLength={CHECKOUT_MAX_LENGTH[name]}
      error={errors[name]}
      onChange={(event) => {
        onChange(name, event.target.value)
        if (errors[name])
          setErrors((prev) => {
            const next = { ...prev }
            delete next[name]
            return next
          })
      }}
      {...props}
    />
  )

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8">
      {isGuest && (
        <p className="rounded-xl bg-bg px-4 py-3 text-sm dark:bg-dark-bg">
          No hace falta una cuenta para comprar.{' '}
          <button
            type="button"
            onClick={(event) => openAuth('login', event.currentTarget)}
            className="rounded-sm font-bold text-accent-main underline underline-offset-4 dark:text-dark-accent-main"
          >
            ¿Ya tenés cuenta? Iniciá sesión
          </button>
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-display text-xl font-semibold">Tus datos</legend>
        {isGuest &&
          field('email', {
            label: 'Email',
            type: 'email',
            inputMode: 'email',
            autoComplete: 'email',
            spellCheck: false,
            placeholder: 'nombre@mail.com…',
            hint: 'Te mandamos ahí la confirmación y el número de pedido.',
          })}
        {field('fullName', {
          label: 'Nombre y apellido',
          autoComplete: 'name',
          placeholder: 'Ana Pérez…',
        })}
        {field('phone', {
          label: 'Teléfono',
          type: 'tel',
          inputMode: 'tel',
          autoComplete: 'tel',
          placeholder: '11 5555 4444…',
          hint: 'Lo usamos solo para coordinar la entrega.',
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 font-display text-xl font-semibold">Dirección de entrega</legend>

        {!isGuest && addresses.status === 'loading' && (
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div className={`h-14 w-full ${skeletonBar}`} />
            <div className={`h-14 w-full ${skeletonBar}`} />
          </div>
        )}
        {!isGuest && addresses.status === 'error' && (
          <p role="alert" className="text-sm">
            No pudimos traer tus direcciones guardadas. Escribí la dirección acá abajo.
          </p>
        )}
        {!isGuest && savedAddresses.length > 0 && (
          <div role="radiogroup" aria-label="Elegí una dirección" className="flex flex-col gap-2">
            {savedAddresses.map((address) => (
              <AddressOption
                key={address.id}
                name={`${baseId}-address`}
                checked={choice === address.id}
                onSelect={() => onChoose(address.id)}
                title={address.label ?? (address.is_default ? 'Predeterminada' : 'Dirección guardada')}
                detail={addressLine(address)}
              />
            ))}
            <AddressOption
              name={`${baseId}-address`}
              checked={choice === 'new'}
              onSelect={() => onChoose('new')}
              title="Usar otra dirección"
              detail={null}
            />
          </div>
        )}

        {!usingSaved && (
          <>
            {field('street', {
              label: 'Calle y número',
              autoComplete: 'street-address',
              placeholder: 'Av. Siempreviva 742, 3.º B…',
            })}
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              {field('city', {
                label: 'Ciudad o localidad',
                autoComplete: 'address-level2',
                placeholder: 'CABA…',
              })}
              {field('postalCode', {
                label: 'Código postal',
                autoComplete: 'postal-code',
                spellCheck: false,
                placeholder: '1405…',
              })}
            </div>
          </>
        )}
      </fieldset>

      <Button type="submit" className="self-start">
        Continuar al envío
      </Button>
    </form>
  )
}

interface AddressOptionProps {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  detail: string | null
}

/** Radio con una sola zona de clic (label que envuelve al input). */
function AddressOption({ name, checked, onSelect, title, detail }: AddressOptionProps) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-[border-color,background-color] duration-200 ease-out has-focus-visible:ring-2 has-focus-visible:ring-accent-main dark:has-focus-visible:ring-dark-accent-main ${
        checked
          ? 'border-accent-main bg-bg dark:border-dark-accent-main dark:bg-dark-bg'
          : 'border-text-main/25 hover:bg-bg dark:border-dark-text-secondary/40 dark:hover:bg-dark-bg'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 size-4 accent-accent-main dark:accent-dark-accent-main" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-bold">
          {detail && <MapPin aria-hidden="true" className="size-4 shrink-0" />}
          {title}
        </span>
        {detail && <span className="block break-words text-sm text-text-main/80 dark:text-dark-text-secondary">{detail}</span>}
      </span>
    </label>
  )
}

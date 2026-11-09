import { useId, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { changePassword, updateProfile } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import { AUTH_MESSAGES, isValidNewPassword } from '../../lib/authMessages'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useAuthStore } from '../../stores/authStore'
import { FormField } from '../../components/ui/FormField'
import { Button } from '../../components/ui/Button'

const CARD = 'rounded-card bg-surface p-6 shadow-soft sm:p-8 dark:bg-dark-card dark:shadow-none'
const PHONE_PATTERN = /^[0-9+() -]*$/

/** Perfil: datos personales (GET/PATCH /users/me) y cambio de contraseña. */
export default function Profile() {
  usePageMeta('Mi perfil', 'Tus datos personales y tu contraseña en Antua.')
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h2 className="font-display text-3xl font-semibold">Perfil</h2>
      <PersonalDataForm />
      <PasswordForm />
    </div>
  )
}

function PersonalDataForm() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const baseId = useId()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({})
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const next: typeof errors = {}
    if (fullName.trim().length < 2) next.fullName = AUTH_MESSAGES.fullName
    if (!PHONE_PATTERN.test(phone)) next.phone = 'Usá solo números, espacios y los signos + ( ) -.'
    setErrors(next)
    setStatus('')
    setFormError(null)
    if (next.fullName || next.phone) {
      document.getElementById(`${baseId}-${next.fullName ? 'name' : 'phone'}`)?.focus()
      return
    }
    setPending(true)
    try {
      setUser(await updateProfile(fullName.trim(), phone.trim()))
      setStatus('Guardamos tus datos.')
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'No pudimos guardar tus datos. Probá de nuevo en un rato.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} aria-labelledby={`${baseId}-title`} className={`flex flex-col gap-4 ${CARD}`}>
      <h3 id={`${baseId}-title`} className="font-display text-xl font-semibold">
        Datos personales
      </h3>
      <FormField id={`${baseId}-email`} label="Email" type="email" name="email" value={user?.email ?? ''} readOnly autoComplete="email" spellCheck={false} hint="Por ahora, el email no se puede cambiar." />
      <FormField
        id={`${baseId}-name`}
        label="Nombre completo"
        name="name"
        autoComplete="name"
        maxLength={155}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        error={errors.fullName}
      />
      <FormField
        id={`${baseId}-phone`}
        label="Teléfono (opcional)"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={20}
        placeholder="099 123 456…"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={errors.phone}
      />
      {formError && (
        <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
          {formError}
        </p>
      )}
      <p aria-live="polite" className={status ? 'font-bold' : 'sr-only'}>
        {status}
      </p>
      <Button type="submit" loading={pending} className="self-start">
        Guardar datos
      </Button>
    </form>
  )
}

type PasswordField = 'current' | 'next' | 'confirm'

function PasswordForm() {
  const setSession = useAuthStore((s) => s.setSession)
  const baseId = useId()
  // `formKey` remonta los campos para vaciarlos después de cambiar la contraseña.
  const [formKey, setFormKey] = useState(0)
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({})
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const fieldId = (field: PasswordField) => `${baseId}-${field}`

  const showErrors = (next: typeof errors) => {
    setErrors(next)
    const first = (['current', 'next', 'confirm'] as const).find((field) => next[field])
    if (first) document.getElementById(fieldId(first))?.focus()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const text = (name: string) => {
      const value = data.get(name)
      return typeof value === 'string' ? value : ''
    }
    const current = text('current-password')
    const next = text('new-password')
    const confirm = text('confirm-password')

    const found: typeof errors = {}
    if (!current) found.current = 'Escribí tu contraseña actual.'
    if (!isValidNewPassword(next)) found.next = AUTH_MESSAGES.passwordMin
    if (confirm !== next) found.confirm = AUTH_MESSAGES.confirm
    setStatus('')
    setFormError(null)
    if (Object.keys(found).length > 0) return showErrors(found)

    setErrors({})
    setPending(true)
    try {
      setSession(await changePassword(current, next))
      setFormKey((k) => k + 1)
      setStatus('Cambiamos tu contraseña. Cerramos las sesiones de otros dispositivos.')
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) showErrors({ current: 'Esa no es tu contraseña actual. Revisala y probá de nuevo.' })
      else setFormError(getApiErrorMessage(error, 'No pudimos cambiar tu contraseña. Probá de nuevo en un rato.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form key={formKey} noValidate onSubmit={(event) => void submit(event)} aria-labelledby={`${baseId}-title`} className={`flex flex-col gap-4 ${CARD}`}>
      <h3 id={`${baseId}-title`} className="font-display text-xl font-semibold">
        Cambiar contraseña
      </h3>
      <FormField id={fieldId('current')} label="Contraseña actual" name="current-password" type="password" autoComplete="current-password" error={errors.current} />
      <FormField id={fieldId('next')} label="Contraseña nueva" name="new-password" type="password" autoComplete="new-password" hint="De 8 a 72 caracteres, con al menos una letra y un número." error={errors.next} />
      <FormField id={fieldId('confirm')} label="Confirmar contraseña nueva" name="confirm-password" type="password" autoComplete="new-password" error={errors.confirm} />
      {formError && (
        <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
          {formError}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Cambiar contraseña
      </Button>
      <p aria-live="polite" className={status ? 'font-bold' : 'sr-only'}>
        {status}
      </p>
    </form>
  )
}

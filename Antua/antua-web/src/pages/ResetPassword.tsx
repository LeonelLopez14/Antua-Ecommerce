import { useId, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { resetPassword } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { AUTH_MESSAGES, isValidNewPassword } from '../lib/authMessages'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuthModalStore } from '../stores/authModalStore'
import { AuthPageShell } from '../components/auth/AuthPageShell'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'

/** Crea una contraseña nueva con el token de un solo uso que llega por email. */
export default function ResetPassword() {
  usePageMeta('Nueva contraseña', 'Creá una contraseña nueva para tu cuenta de Antua.')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const baseId = useId()
  const openAuth = useAuthModalStore((s) => s.open)
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [invalidLink, setInvalidLink] = useState(token === '')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const text = (name: string) => {
      const value = data.get(name)
      return typeof value === 'string' ? value : ''
    }
    const password = text('new-password')
    const next: typeof errors = {}
    if (!isValidNewPassword(password)) next.password = AUTH_MESSAGES.passwordMin
    if (text('confirm-password') !== password) next.confirm = AUTH_MESSAGES.confirm
    setErrors(next)
    setFormError(null)
    if (next.password || next.confirm) {
      document.getElementById(`${baseId}-${next.password ? 'password' : 'confirm'}`)?.focus()
      return
    }
    setPending(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) setInvalidLink(true)
      else setFormError(getApiErrorMessage(error, 'No pudimos cambiar tu contraseña. Probá de nuevo en un rato.'))
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <AuthPageShell title="Listo" intro="Tu contraseña cambió. Ya podés iniciar sesión con la nueva.">
        <p role="status" className="sr-only">
          Contraseña actualizada.
        </p>
        <Button onClick={(event) => openAuth('login', event.currentTarget)}>Iniciar sesión</Button>
      </AuthPageShell>
    )
  }

  if (invalidLink) {
    return (
      <AuthPageShell title="Este link ya no sirve" intro="Puede haber vencido o ya se usó. Pedí uno nuevo y usalo dentro de los 60 minutos.">
        <p role="alert" className="sr-only">
          El link no es válido.
        </p>
        <ButtonLink to="/olvide-mi-contrasena">Pedir un link nuevo</ButtonLink>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell title="Creá tu contraseña nueva" intro="Después vas a poder iniciar sesión con ella.">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormField
          id={`${baseId}-password`}
          label="Contraseña nueva"
          name="new-password"
          type="password"
          autoComplete="new-password"
          hint="De 8 a 72 caracteres, con al menos una letra y un número."
          error={errors.password}
        />
        <FormField
          id={`${baseId}-confirm`}
          label="Confirmar contraseña"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm}
        />
        {formError && (
          <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
            {formError}
          </p>
        )}
        <Button type="submit" loading={pending}>
          {pending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthPageShell>
  )
}

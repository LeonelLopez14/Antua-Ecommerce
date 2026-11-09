import { useId, useRef, useState, type FormEvent } from 'react'
import { requestPasswordReset } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { AUTH_MESSAGES, EMAIL_PATTERN } from '../lib/authMessages'
import { usePageMeta } from '../hooks/usePageMeta'
import { AuthPageShell } from '../components/auth/AuthPageShell'
import { FormField } from '../components/ui/FormField'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'

/** Pedido de recuperación. El mensaje final es el mismo exista o no la cuenta. */
export default function ForgotPassword() {
  usePageMeta('Recuperar contraseña', 'Pedí un link para restablecer tu contraseña de Antua.')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [emailError, setEmailError] = useState<string>()
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const value = new FormData(event.currentTarget).get('email')
    const email = typeof value === 'string' ? value.trim() : ''
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(AUTH_MESSAGES.email)
      inputRef.current?.focus()
      return
    }
    setEmailError(undefined)
    setFormError(null)
    setPending(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'No pudimos procesar el pedido. Probá de nuevo en un rato.'))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <AuthPageShell title="Revisá tu email" intro="Si ese email tiene una cuenta, te mandamos un link para restablecer la contraseña. Vence en 60 minutos.">
        <p role="status" className="sr-only">
          Pedido enviado.
        </p>
        <ButtonLink to="/tienda" variant="secondary">
          Ver galletas
        </ButtonLink>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell title="Recuperá tu contraseña" intro="Escribí el email de tu cuenta y te mandamos un link para crear una nueva.">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormField
          ref={inputRef}
          id={inputId}
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="nombre@mail.com…"
          error={emailError}
        />
        {formError && (
          <p role="alert" className="font-bold text-accent-main dark:text-dark-accent-main">
            {formError}
          </p>
        )}
        <Button type="submit" loading={pending}>
          {pending ? 'Enviando…' : 'Enviar link'}
        </Button>
      </form>
    </AuthPageShell>
  )
}

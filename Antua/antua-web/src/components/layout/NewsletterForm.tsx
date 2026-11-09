import { useId, useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '../../api/client'
import { EMAIL_PATTERN } from '../../lib/authMessages'

/** Newsletter del footer (POST /newsletter/subscribe). La respuesta no revela si el email ya estaba. */
export function NewsletterForm() {
  const inputId = useId()
  const hintId = useId()
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const value = new FormData(form).get('newsletter-email')
    const email = typeof value === 'string' ? value.trim() : ''
    setStatus('')
    if (!EMAIL_PATTERN.test(email)) {
      setError('Escribí un email válido, por ejemplo nombre@mail.com.')
      document.getElementById(inputId)?.focus()
      return
    }
    setError(null)
    setPending(true)
    try {
      await api.post('/newsletter/subscribe', { email })
      form.reset()
      setStatus('¡Listo! Te vamos a avisar de las tandas nuevas.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No pudimos sumarte a la lista. Probá de nuevo en un rato.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="mt-8">
      <label htmlFor={inputId} className="font-display text-lg font-semibold">
        Newsletter
      </label>
      <p id={hintId} className="mt-1 text-sm text-surface/80 dark:text-dark-text-secondary">
        Recibí las tandas nuevas por email.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          id={inputId}
          type="email"
          name="newsletter-email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          maxLength={155}
          placeholder="nombre@mail.com…"
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-surface/60 bg-transparent px-3 text-surface placeholder:text-surface/60 dark:border-dark-text-secondary/60 dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70"
        />
        <button
          type="submit"
          aria-busy={pending || undefined}
          className="min-h-11 rounded-full border-2 border-surface/60 px-5 font-bold text-surface transition-[background-color,color] duration-200 ease-out hover:bg-surface hover:text-footer dark:border-dark-text-secondary/60 dark:text-dark-text-main dark:hover:bg-dark-card dark:hover:text-dark-text-main"
        >
          {pending ? 'Enviando…' : 'Suscribirme'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold">
          {error}
        </p>
      )}
      <p aria-live="polite" className={status ? 'mt-2 text-sm font-bold' : 'sr-only'}>
        {status}
      </p>
    </form>
  )
}

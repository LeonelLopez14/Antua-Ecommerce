import { useId, type FormEvent } from 'react'

/**
 * Newsletter del footer (wireframe de Home). antua-api no tiene un endpoint de suscripción,
 * así que queda deshabilitada: se ve, se entiende que llega pronto y no simula suscribir a nadie.
 *
 * TODO(newsletter): cuando exista el endpoint (ej.: POST /newsletter { email }), habilitar el input
 * y el botón, enviar el email y anunciar el resultado con aria-live.
 */
export function NewsletterForm() {
  const inputId = useId()
  const hintId = useId()
  const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault()

  return (
    <form onSubmit={preventSubmit} aria-describedby={hintId} className="mt-8">
      <label htmlFor={inputId} className="font-display text-lg font-semibold">
        Newsletter
      </label>
      <p id={hintId} className="mt-1 text-sm text-surface/80 dark:text-dark-text-secondary">
        Muy pronto vas a poder recibir las tandas nuevas por email.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          id={inputId}
          type="email"
          name="newsletter-email"
          autoComplete="email"
          placeholder="nombre@mail.com…"
          readOnly
          aria-disabled="true"
          className="min-h-11 min-w-0 flex-1 cursor-not-allowed rounded-xl border border-surface/40 bg-transparent px-3 text-surface placeholder:text-surface/60 dark:border-dark-text-secondary/60 dark:text-dark-text-main dark:placeholder:text-dark-text-secondary/70"
        />
        <button
          type="submit"
          aria-disabled="true"
          className="min-h-11 cursor-not-allowed rounded-full border-2 border-surface/40 px-5 font-bold text-surface/80 dark:border-dark-text-secondary/60 dark:text-dark-text-secondary"
        >
          Suscribirme
        </button>
      </div>
    </form>
  )
}

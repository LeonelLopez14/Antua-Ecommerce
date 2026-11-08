import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ButtonLink } from '../components/ui/ButtonLink'
import { CookieFallback } from '../three/cookie/CookieFallback'

interface NotFoundProps {
  title?: string
  message?: string
}

export default function NotFound({
  title = 'No encontramos esta página',
  message = 'Puede que el link esté mal escrito o que la página ya no exista.',
}: NotFoundProps) {
  useDocumentTitle(title)

  return (
    <section aria-labelledby="notfound-title" className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <CookieFallback className="size-32 opacity-80" />
      <h1 id="notfound-title" className="mt-6 font-display text-4xl font-bold">
        {title}
      </h1>
      <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/tienda">Ver galletas</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    </section>
  )
}

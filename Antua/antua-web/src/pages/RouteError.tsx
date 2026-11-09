import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { CookieFallback } from '../three/cookie/CookieFallback'
import { Button } from '../components/ui/Button'
import { usePageMeta } from '../hooks/usePageMeta'

/** El chunk de una página no se pudo bajar (típico después de publicar una versión nueva). */
const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message)

/**
 * ErrorBoundary global (errorElement de la ruta raíz): cualquier error de render o de carga
 * de una página termina acá, con una salida clara en vez de una pantalla en blanco.
 */
export default function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const chunk = isChunkLoadError(error)

  usePageMeta(notFound ? 'No encontramos esta página' : 'Algo salió mal')

  return (
    <main id="contenido" className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <CookieFallback className="size-32 opacity-80" />
      <h1 className="mt-6 font-display text-4xl font-bold">{notFound ? 'No encontramos esta página' : 'Se nos quemó una tanda'}</h1>
      <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">
        {chunk
          ? 'Publicamos una versión nueva del sitio. Recargá la página para seguir.'
          : 'Algo salió mal de nuestro lado. Probá de nuevo; si sigue pasando, escribinos a hola@antua.com.ar.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
        {/* <a> y no <Link>: el router puede estar en un estado roto, así que se recarga desde cero. */}
        <a
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-accent-tertiary px-6 py-3 font-bold transition-[background-color] duration-200 ease-out hover:bg-accent-secondary dark:border-dark-text-secondary dark:hover:bg-dark-card"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  )
}

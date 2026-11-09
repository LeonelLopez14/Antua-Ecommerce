import { skeletonBar } from '../ui/skeleton'

/** Fallback de Suspense mientras baja el código de una página (carga diferida por ruta). */
export function PageSkeleton() {
  return (
    <div className="mx-auto min-h-svh max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      <p role="status" className="sr-only">
        Cargando la página…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className={`h-12 w-2/3 max-w-md ${skeletonBar}`} />
        <div className={`h-5 w-full max-w-xl ${skeletonBar}`} />
        <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 rounded-card bg-surface motion-safe:animate-pulse dark:bg-dark-surface" />
          ))}
        </div>
      </div>
    </div>
  )
}

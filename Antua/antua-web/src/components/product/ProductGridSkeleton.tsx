import { skeletonBar } from '../ui/skeleton'

interface ProductGridSkeletonProps {
  count: number
  /** Clases de la grilla; por defecto la de la Home. */
  gridClassName?: string
}

/** Placeholder con la misma geometría que ProductCard, para que no salte el layout al cargar. */
export function ProductGridSkeleton({ count, gridClassName = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4' }: ProductGridSkeletonProps) {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando galletas…
      </p>
      <div aria-hidden="true" className={gridClassName}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col rounded-card bg-bg p-6 dark:bg-dark-card">
            <div className="aspect-square rounded-card bg-accent-secondary motion-safe:animate-pulse dark:bg-dark-bg" />
            <div className={`mt-4 h-5 w-20 ${skeletonBar}`} />
            <div className={`mt-3 h-6 w-3/4 ${skeletonBar}`} />
            <div className={`mt-3 h-4 w-full ${skeletonBar}`} />
            <div className={`mt-6 h-6 w-24 ${skeletonBar}`} />
          </div>
        ))}
      </div>
    </>
  )
}

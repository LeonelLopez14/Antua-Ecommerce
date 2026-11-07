import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  /** href de cada página (links reales: Ctrl/Cmd+clic abre en otra pestaña). */
  hrefFor: (page: number) => string
}

const item =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-bold tabular-nums ' +
  'transition-[background-color,color] duration-200 ease-out'
const idle = `${item} text-text-main hover:bg-accent-secondary dark:text-dark-text-main dark:hover:bg-dark-card`
const current = `${item} bg-accent-main text-bg dark:bg-dark-accent-main dark:text-dark-bg`
const disabled = `${item} text-text-main/40 dark:text-dark-text-main/40`

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="mt-12 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link to={hrefFor(page - 1)} className={idle}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span>Anterior</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span>Anterior</span>
            </span>
          )}
        </li>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              to={hrefFor(n)}
              aria-label={`Página ${n}`}
              aria-current={n === page ? 'page' : undefined}
              className={n === page ? current : idle}
            >
              {n}
            </Link>
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link to={hrefFor(page + 1)} className={idle}>
              <span>Siguiente</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              <span>Siguiente</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}

import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Si la columna se puede ordenar, href que la ordena (el orden vive en la URL). */
  sortHref?: (direction: 'asc' | 'desc') => string
  align?: 'start' | 'end'
  /** La primera columna de datos actúa como encabezado de fila (th scope="row"). */
  rowHeader?: boolean
  className?: string
}

interface DataTableProps<T> {
  caption: string
  /** Oculta el caption visualmente (el encabezado de la página ya lo dice). */
  hideCaption?: boolean
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  sort?: { key: string; direction: 'asc' | 'desc' }
}

/**
 * Tabla accesible del panel: caption, th con scope, aria-sort y orden con links reales.
 * Va dentro de una región con nombre y foco por teclado, que scrollea en horizontal si no entra
 * (a 375 px no rompe la página).
 */
export function DataTable<T>({ caption, hideCaption = false, columns, rows, rowKey, sort }: DataTableProps<T>) {
  const captionId = useId()
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="overflow-x-auto overscroll-x-contain rounded-card bg-surface shadow-soft dark:bg-dark-card dark:shadow-none"
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption id={captionId} className={hideCaption ? 'sr-only' : 'px-4 pt-4 text-left font-display text-lg font-semibold'}>
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-text-main/15 dark:border-dark-text-main/15">
            {columns.map((column) => {
              const active = sort?.key === column.key
              const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : column.sortHref ? 'none' : undefined
              const next = active && sort.direction === 'asc' ? 'desc' : 'asc'
              const Icon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={`px-4 py-3 font-bold whitespace-nowrap ${column.align === 'end' ? 'text-right' : ''}`}
                >
                  {column.sortHref ? (
                    <Link
                      to={column.sortHref(next)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 -mx-2 transition-[background-color] duration-200 ease-out hover:bg-accent-secondary dark:hover:bg-dark-bg"
                    >
                      {column.header}
                      <Icon aria-hidden="true" className="size-3.5" />
                      <span className="sr-only">
                        {active ? `, ordenado ${sort.direction === 'asc' ? 'ascendente' : 'descendente'}` : ', ordenar'}
                      </span>
                    </Link>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-text-main/10 last:border-0 dark:border-dark-text-main/10">
              {columns.map((column) => {
                const className = `px-4 py-3 align-middle ${column.align === 'end' ? 'text-right tabular-nums' : ''} ${column.className ?? ''}`
                return column.rowHeader ? (
                  <th key={column.key} scope="row" className={`${className} font-normal`}>
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={column.key} className={className}>
                    {column.cell(row)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

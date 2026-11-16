import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filtros, orden y página del panel viven en la URL (se pueden compartir y sobreviven a recargar).
 * `set` cambia un parámetro y vuelve a la página 1; vacío lo quita.
 */
export function useAdminQuery() {
  const [params, setParams] = useSearchParams()

  const get = useCallback((key: string) => params.get(key) ?? '', [params])
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

  const set = useCallback(
    (updates: Record<string, string>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(updates)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          if (!('page' in updates)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  /** href con un cambio puntual (para links de paginación y orden). */
  const hrefWith = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      const query = next.toString()
      return query ? `?${query}` : '?'
    },
    [params],
  )

  return { params, get, set, page, hrefWith, key: params.toString() }
}

import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { getApiErrorMessage, isNotFoundError } from '../api/client'

export type Resource<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; data: T }

/**
 * Carga un recurso de la API con estados (cargando, error con reintento, listo) y cancela
 * la request si cambia la clave o se desmonta. Con `key = null` no pide nada (ej.: sin sesión).
 * `setData` permite reflejar cambios locales (ej.: después de borrar una dirección).
 */
export function useResource<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Resource<T>>(key ? { status: 'loading' } : { status: 'idle' })
  const [attempt, setAttempt] = useState(0)

  // Al cambiar la clave, volver a "cargando" durante el render (sin un frame con datos viejos).
  const fullKey = key === null ? null : `${key}#${attempt}`
  const [loadedKey, setLoadedKey] = useState(fullKey)
  if (loadedKey !== fullKey) {
    setLoadedKey(fullKey)
    setState(fullKey === null ? { status: 'idle' } : { status: 'loading' })
  }

  const run = useEffectEvent((signal: AbortSignal) => load(signal))

  useEffect(() => {
    if (fullKey === null) return
    const controller = new AbortController()
    run(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: getApiErrorMessage(error), notFound: isNotFoundError(error) })
      })
    return () => controller.abort()
  }, [fullKey])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const setData = useCallback(
    (update: (data: T) => T) => setState((s) => (s.status === 'ready' ? { status: 'ready', data: update(s.data) } : s)),
    [],
  )

  return { state, retry, setData }
}

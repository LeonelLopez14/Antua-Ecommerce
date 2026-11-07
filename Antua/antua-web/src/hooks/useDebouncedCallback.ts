import { useCallback, useEffect, useRef } from 'react'

/** Devuelve una versión de `fn` que se ejecuta `delay` ms después de la última llamada. Se cancela al desmontar. */
export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  const fnRef = useRef(fn)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return useCallback(
    (...args: Args) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => fnRef.current(...args), delay)
    },
    [delay],
  )
}

import { useEffect, useState } from 'react'

/**
 * true cuando la página ya cargó y el navegador está libre (o pasaron `timeout` ms).
 * Sirve para diferir trabajo pesado que no es crítico para el primer pintado (la escena 3D).
 */
export function useAfterLoadIdle(timeout = 2000): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let idleId: number | undefined
    let timerId: number | undefined
    const schedule = () => {
      if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(() => setReady(true), { timeout })
      // Safari no tiene requestIdleCallback.
      else timerId = globalThis.setTimeout(() => setReady(true), 200)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      window.removeEventListener('load', schedule)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      window.clearTimeout(timerId)
    }
  }, [timeout])

  return ready
}

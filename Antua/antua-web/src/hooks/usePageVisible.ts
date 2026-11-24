import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/** false mientras la pestaña está oculta (otra pestaña, ventana minimizada). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState !== 'hidden',
    () => true,
  )
}

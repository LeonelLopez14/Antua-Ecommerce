import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Avisa antes de salir con cambios sin guardar: al navegar dentro de la app (useBlocker, que
 * se muestra con UnsavedChangesDialog) y al cerrar o recargar la pestaña (beforeunload).
 * `allowNextNavigation()` deja pasar la navegación que sigue a un guardado exitoso.
 */
export function useUnsavedChanges(dirty: boolean) {
  const allowRef = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowRef.current) {
      allowRef.current = false
      return false
    }
    return dirty && currentLocation.pathname !== nextLocation.pathname
  })
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
  const allowNextNavigation = useCallback(() => {
    allowRef.current = true
  }, [])
  return { blocker, allowNextNavigation }
}

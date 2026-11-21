import { useEffect } from 'react'

/** Páginas privadas (cuenta, checkout, panel): meta robots noindex mientras están montadas. */
export function useNoIndex(): void {
  useEffect(() => {
    const element = document.createElement('meta')
    element.name = 'robots'
    element.content = 'noindex, nofollow'
    document.head.append(element)
    return () => element.remove()
  }, [])
}

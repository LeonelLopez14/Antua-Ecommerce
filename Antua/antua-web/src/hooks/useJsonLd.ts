import { useEffect } from 'react'

/** Inserta un <script type="application/ld+json"> mientras el componente está montado. */
export function useJsonLd(data: Record<string, unknown> | null): void {
  const json = data ? JSON.stringify(data) : null
  useEffect(() => {
    if (!json) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = json
    document.head.append(script)
    return () => script.remove()
  }, [json])
}

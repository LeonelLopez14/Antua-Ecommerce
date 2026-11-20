import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Descripción por defecto (la misma que trae index.html). */
const DEFAULT_DESCRIPTION = 'Antojarte: galletas caseras, sin gluten, veganas y sin azúcar. Date un gustito.'
const SITE_NAME = 'Antojarte'

/** Crea o actualiza un <meta> o <link> del <head>. */
function upsert(selector: string, create: () => HTMLElement, set: (element: HTMLElement) => void): void {
  let element = document.head.querySelector<HTMLElement>(selector)
  if (!element) {
    element = create()
    document.head.append(element)
  }
  set(element)
}

const meta = (attr: 'name' | 'property', key: string, content: string) =>
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const element = document.createElement('meta')
      element.setAttribute(attr, key)
      return element
    },
    (element) => element.setAttribute('content', content),
  )

/**
 * Título de la pestaña ("<página> · Antojarte"), meta description, canonical y Open Graph básicos,
 * sin librerías. Con `title = null` no se cambia nada (ej.: mientras carga la ficha).
 * El canonical es la ruta sin parámetros (los filtros de la Tienda no son páginas distintas).
 * Limitación: es una SPA sin SSR; quien no ejecuta JavaScript ve los valores de index.html.
 */
export function usePageMeta(title: string | null, description?: string): void {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!title) return
    const fullTitle = `${title} · ${SITE_NAME}`
    const text = description ?? DEFAULT_DESCRIPTION
    const url = `${window.location.origin}${pathname}`
    document.title = fullTitle
    meta('name', 'description', text)
    upsert(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement('link')
        link.rel = 'canonical'
        return link
      },
      (element) => element.setAttribute('href', url),
    )
    meta('property', 'og:title', fullTitle)
    meta('property', 'og:description', text)
    meta('property', 'og:url', url)
  }, [title, description, pathname])
}

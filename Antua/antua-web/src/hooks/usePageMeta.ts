import { useEffect } from 'react'

/** Descripción por defecto (la misma que trae index.html). */
const DEFAULT_DESCRIPTION = 'Antua: galletas caseras, sin gluten, veganas y sin azúcar. Date un gustito.'

function setDescription(content: string): void {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = 'description'
    document.head.append(tag)
  }
  tag.content = content
}

/**
 * Título de la pestaña ("<página> · Antua") y meta description de cada página, sin librerías.
 * Con `title = null` no se cambia nada (ej.: mientras carga la ficha). Sin descripción, se usa la general.
 */
export function usePageMeta(title: string | null, description?: string): void {
  useEffect(() => {
    if (!title) return
    document.title = `${title} · Antua`
    setDescription(description ?? DEFAULT_DESCRIPTION)
  }, [title, description])
}

import { useEffect } from 'react'

/** Título de la pestaña: "<página> · Antua". Con null no lo cambia (ej.: mientras carga). */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title) document.title = `${title} · Antua`
  }, [title])
}

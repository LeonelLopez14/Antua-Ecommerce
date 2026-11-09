import type { ReactNode } from 'react'
import { usePageMeta } from '../../hooks/usePageMeta'

interface ContentPageProps {
  title: string
  intro: string
  children: ReactNode
}

/**
 * Página de texto (institucionales y legales). Todas llevan el aviso de texto provisorio
 * hasta que el contenido real esté escrito y revisado.
 */
export function ContentPage({ title, intro, children }: ContentPageProps) {
  usePageMeta(title, intro)
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.25rem,4vw,3rem)] leading-tight font-bold">{title}</h1>
      <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">{intro}</p>
      <p role="note" className="mt-6 rounded-xl bg-accent-secondary px-4 py-3 text-sm text-text-main dark:bg-dark-card dark:text-dark-text-main">
        <strong>Texto provisorio.</strong> Esta página todavía no tiene su versión final.
      </p>
      {/* Estilos de texto largo: títulos, párrafos y listas con aire. */}
      <div className="mt-10 flex flex-col gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </article>
  )
}

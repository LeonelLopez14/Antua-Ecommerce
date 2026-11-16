import type { ReactNode } from 'react'
import { usePageMeta } from '../../hooks/usePageMeta'

interface ContentPageProps {
  title: string
  /** Meta description (docs/contenido-sitio.md). */
  description: string
  /** Bajada bajo el título (opcional). */
  intro?: ReactNode
  /** Aviso destacado arriba del contenido (ej.: "Borrador de práctica"). */
  notice?: ReactNode
  /** Nota chica al pie (ej.: marca ficticia). */
  footnote?: ReactNode
  children: ReactNode
}

/** Estilos de texto largo: títulos, párrafos y listas con aire. Los h2 dejan espacio para las anclas. */
export const proseClasses =
  'flex flex-col gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:scroll-mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold ' +
  '[&_h3]:mt-2 [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 ' +
  '[&_a:not([class])]:font-bold [&_a:not([class])]:text-accent-main [&_a:not([class])]:underline [&_a:not([class])]:underline-offset-4 dark:[&_a:not([class])]:text-dark-accent-main'

/** Página de texto (institucionales y legales). */
export function ContentPage({ title, description, intro, notice, footnote, children }: ContentPageProps) {
  usePageMeta(title, description)
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.25rem,4vw,3rem)] leading-tight font-bold">{title}</h1>
      {intro && <div className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">{intro}</div>}
      {notice && (
        <div role="note" className="mt-6 rounded-xl bg-accent-secondary px-4 py-3 text-sm text-text-main dark:bg-dark-card dark:text-dark-text-main">
          {notice}
        </div>
      )}
      <div className={`mt-10 ${proseClasses}`}>{children}</div>
      {footnote && <p className="mt-12 text-sm text-text-main/75 dark:text-dark-text-secondary">{footnote}</p>}
    </article>
  )
}

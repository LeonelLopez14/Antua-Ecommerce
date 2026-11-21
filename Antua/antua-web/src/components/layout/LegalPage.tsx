import type { ReactNode } from 'react'
import { ContentPage } from './ContentPage'
import { formatDate } from '../../lib/format'
import { LEGAL_UPDATED_AT } from '../../data/site'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface LegalPageProps {
  title: string
  description: string
  /** Texto del aviso de borrador (se muestra siempre arriba). */
  draftNotice: ReactNode
  sections: LegalSection[]
}

/** Términos y Privacidad: aviso de borrador visible, índice con anclas y fecha de última actualización. */
export function LegalPage({ title, description, draftNotice, sections }: LegalPageProps) {
  return (
    <ContentPage
      title={title}
      description={description}
      intro={
        <p>
          Última actualización: <time dateTime={LEGAL_UPDATED_AT}>{formatDate(`${LEGAL_UPDATED_AT}T12:00:00Z`)}</time>
        </p>
      }
      notice={draftNotice}
    >
      <nav aria-labelledby="indice-title" className="rounded-card bg-surface p-5 dark:bg-dark-surface">
        <h2 id="indice-title" className="!mt-0 !text-xl">
          Contenido
        </h2>
        <ol className="mt-3 flex list-decimal flex-col gap-1 pl-6">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-flex min-h-11 items-center font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((section, index) => (
        <section key={section.id} aria-labelledby={section.id} className="flex flex-col gap-3">
          <h2 id={section.id}>
            {index + 1}. {section.title}
          </h2>
          {section.body}
        </section>
      ))}
    </ContentPage>
  )
}

import { Leaf } from 'lucide-react'
import { categoryHref } from '../../data/categories'
import { ButtonLink } from '../ui/ButtonLink'

export function IngredientsBanner() {
  return (
    <section aria-labelledby="ingredientes-title" className="px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 rounded-card bg-accent-tertiary p-8 md:flex-row md:items-center md:justify-between md:p-12 dark:bg-dark-card">
        <div className="flex max-w-2xl gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bg dark:bg-dark-bg">
            <Leaf aria-hidden="true" className="size-6 text-accent-main dark:text-dark-accent-main" />
          </span>
          <div className="min-w-0">
            <h2 id="ingredientes-title" className="font-display text-3xl leading-tight font-semibold">
              Ingredientes que podés nombrar
            </h2>
            <p className="mt-3 text-text-main dark:text-dark-text-secondary">
              Harinas seleccionadas, manteca, huevos de campo y chocolate de verdad. Sin conservantes. Y si no
              podés comer gluten, también tenemos para vos.
            </p>
          </div>
        </div>
        <ButtonLink to={categoryHref('sin-gluten')} className="shrink-0">
          Ver opciones sin gluten
        </ButtonLink>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { categoryHref, homeCategories } from '../../data/categories'

export function QuickCategories() {
  return (
    <section aria-labelledby="categorias-title" className="bg-accent-secondary dark:bg-dark-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:gap-8">
        <h2 id="categorias-title" className="shrink-0 font-display text-xl font-semibold">
          ¿Qué se te antoja?
        </h2>
        <ul className="flex flex-wrap gap-2">
          {homeCategories.map(({ slug, label, icon: Icon }) => (
            <li key={slug}>
              <Link
                to={categoryHref(slug)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-bg px-4 py-2 text-sm font-bold text-text-main shadow-soft transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0 dark:bg-dark-card dark:text-dark-text-main dark:shadow-none dark:hover:text-dark-accent-main"
              >
                <Icon aria-hidden="true" className="size-4 text-accent-main dark:text-dark-accent-main" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

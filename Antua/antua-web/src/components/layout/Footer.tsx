import { Link } from 'react-router-dom'
import { Cookie, Mail, MapPin } from 'lucide-react'
import { categoryHref, homeCategories } from '../../data/categories'

const footerLink =
  'rounded-sm text-surface/80 underline-offset-4 transition-[color] duration-200 ease-out hover:text-surface hover:underline ' +
  'dark:text-dark-text-secondary dark:hover:text-dark-text-main'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-footer text-surface dark:bg-dark-footer dark:text-dark-text-main [&_a:focus-visible]:outline-surface dark:[&_a:focus-visible]:outline-dark-accent-main">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-sm">
          <p translate="no" className="flex items-center gap-2 font-display text-2xl font-bold">
            <Cookie aria-hidden="true" className="size-7" />
            Antua
          </p>
          <p className="mt-4 text-surface/80 dark:text-dark-text-secondary">
            Hechas para darte un gustito. Galletas caseras, horneadas en tandas chicas.
          </p>
        </div>

        <nav aria-labelledby="footer-categorias">
          <h2 id="footer-categorias" className="font-display text-lg font-semibold">
            Categorías
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {homeCategories.map(({ slug, label }) => (
              <li key={slug}>
                <Link to={categoryHref(slug)} className={footerLink}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg font-semibold">Contacto</h2>
          {/* TODO(contenido): reemplazar por los datos reales de contacto. */}
          <ul className="mt-4 flex flex-col gap-3">
            <li className="flex items-center gap-2">
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              <a href="mailto:hola@antua.com.ar" className={footerLink}>
                hola@antua.com.ar
              </a>
            </li>
            <li className="flex items-center gap-2 text-surface/80 dark:text-dark-text-secondary">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              Buenos Aires, Argentina
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-surface/15 dark:border-dark-text-main/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-surface/70 sm:px-6 dark:text-dark-text-secondary">
          © {year} <span translate="no">Antua</span>. Hecho con manteca y paciencia.
        </p>
      </div>
    </footer>
  )
}

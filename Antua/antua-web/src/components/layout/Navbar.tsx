import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { Logo } from './Logo'
import { categoryHref, homeCategories } from '../../data/categories'
import { selectItemCount, useCartStore } from '../../stores/cartStore'
import { AccountMenu } from '../auth/AccountMenu'
import { iconButtonClasses } from '../ui/buttonStyles'

const iconButton = `${iconButtonClasses()} text-text-main dark:text-dark-text-main`

const navLink =
  'rounded-full px-3 py-2 text-sm font-bold text-text-main transition-[background-color,color] duration-200 ease-out ' +
  'hover:bg-accent-secondary dark:text-dark-text-main dark:hover:bg-dark-card'

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const itemCount = useCartStore(selectItemCount)
  const openCart = useCartStore((s) => s.open)
  const cartLabel =
    itemCount === 0 ? 'Carrito, vacío' : `Carrito, ${itemCount} ${itemCount === 1 ? 'galleta' : 'galletas'}`

  return (
    <header className="relative z-20 bg-surface shadow-soft dark:bg-dark-surface dark:shadow-none">
      <nav aria-label="Principal" className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {homeCategories.map(({ slug, label }) => (
            <li key={slug}>
              <Link to={categoryHref(slug)} className={navLink}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1">
          <AccountMenu buttonClassName={iconButton} />
          <button
            type="button"
            aria-label={cartLabel}
            aria-haspopup="dialog"
            onClick={(event) => openCart(event.currentTarget)}
            className={`${iconButton} relative`}
          >
            <ShoppingBag aria-hidden="true" className="size-5" />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent-main px-1 text-xs leading-5 font-bold text-bg tabular-nums dark:bg-dark-accent-main dark:text-dark-bg"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className={`${iconButton} md:hidden`}
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </nav>

      <div
        id={menuId}
        hidden={!menuOpen}
        className="border-t border-text-main/10 px-4 pb-4 md:hidden dark:border-dark-text-main/10"
      >
        <ul className="flex flex-col gap-1 pt-2">
          {homeCategories.map(({ slug, label, icon: Icon }) => (
            <li key={slug}>
              <Link
                to={categoryHref(slug)}
                onClick={() => setMenuOpen(false)}
                className={`${navLink} flex min-h-11 items-center gap-3 text-base`}
              >
                <Icon aria-hidden="true" className="size-5 text-accent-main dark:text-dark-accent-main" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}

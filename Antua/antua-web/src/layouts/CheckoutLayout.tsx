import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSkeleton } from '../components/layout/PageSkeleton'
import { Logo } from '../components/layout/Logo'
import { SkipLink } from '../components/layout/SkipLink'

/** Checkout: navbar mínima con solo el logo (DESIGN.md §4, Navbar) para no distraer de la compra. */
export function CheckoutLayout() {
  return (
    <>
      <SkipLink />
      <header className="relative z-20 bg-surface shadow-soft dark:bg-dark-surface dark:shadow-none">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="contenido" className="min-h-[calc(100svh-4rem)]">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}

import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { Cookie } from 'lucide-react'
import { ButtonLink } from '../components/ui/ButtonLink'

/** Página provisoria hasta construir el checkout en 4 pasos (DESIGN.md §4). */
export default function Checkout() {
  useDocumentTitle('Checkout')

  return (
    <section aria-labelledby="checkout-title" className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent-secondary dark:bg-dark-card">
        <Cookie aria-hidden="true" className="size-8 text-accent-main dark:text-dark-accent-main" />
      </span>
      <h1 id="checkout-title" className="mt-6 font-display text-4xl font-bold">
        Próximamente
      </h1>
      <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">
        Estamos horneando el checkout. Tu carrito queda guardado mientras tanto.
      </p>
      <ButtonLink to="/tienda" className="mt-8">
        Seguir mirando galletas
      </ButtonLink>
    </section>
  )
}

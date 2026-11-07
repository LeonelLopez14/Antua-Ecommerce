import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { AuthModal } from '../components/auth/AuthModal'
import { CartDrawer } from '../components/cart/CartDrawer'

export function MainLayout() {
  const { pathname } = useLocation()
  const loadCart = useCartStore((s) => s.load)
  const verifySession = useAuthStore((s) => s.verifySession)

  // Primero se descarta un JWT vencido; si no, el carrito se pediría con una sesión inválida.
  useEffect(() => {
    void verifySession().then(loadCart)
  }, [verifySession, loadCart])

  // Al cambiar de página, arrancar arriba (el hash #contenido del skip link no cambia el pathname).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-full bg-accent-main px-4 py-2 font-bold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-dark-accent-main dark:text-dark-bg"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido">
        {/* Las páginas se cargan en diferido; el fallback reserva alto para que el footer no salte. */}
        <Suspense fallback={<div className="min-h-svh" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <AuthModal />
    </>
  )
}

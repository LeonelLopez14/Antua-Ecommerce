import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { AuthModal } from '../components/auth/AuthModal'
import { CartDrawer } from '../components/cart/CartDrawer'

/**
 * Raíz de todas las rutas: valida la sesión, carga el carrito y monta los paneles globales
 * (carrito y AuthModal), que se usan tanto en el sitio como en el checkout.
 */
export function RootLayout() {
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
      <Outlet />
      <CartDrawer />
      <AuthModal />
    </>
  )
}

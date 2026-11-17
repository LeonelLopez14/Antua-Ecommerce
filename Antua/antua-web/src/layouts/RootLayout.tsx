import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { useAuthModalStore } from '../stores/authModalStore'
import { SESSION_EXPIRED, SESSION_EXPIRED_EVENT } from '../api/client'
import { LazyPanels } from '../components/layout/LazyPanels'

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

  // Sesión vencida a mitad de algo: se cierra, el carrito vuelve a ser de invitado y se ofrece
  // iniciar sesión de nuevo en el mismo lugar (al volver, AuthModal recupera el carrito de la cuenta).
  useEffect(() => {
    const onExpired = () => {
      if (!useAuthStore.getState().token) return
      useAuthStore.getState().clearSession()
      void useCartStore.getState().reset()
      useAuthModalStore.getState().open('login', null, SESSION_EXPIRED)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  // Al cambiar de página, arrancar arriba (el hash #contenido del skip link no cambia el pathname).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Outlet />
      <LazyPanels />
    </>
  )
}

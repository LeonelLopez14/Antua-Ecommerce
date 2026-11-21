import { lazy, Suspense, useState } from 'react'
import { useCartStore } from '../../stores/cartStore'
import { useAuthModalStore } from '../../stores/authModalStore'
import { loadAuthModal, loadCartDrawer } from '../../lib/panels'

const CartDrawer = lazy(() => loadCartDrawer().then((m) => ({ default: m.CartDrawer })))
const AuthModal = lazy(() => loadAuthModal().then((m) => ({ default: m.AuthModal })))

/**
 * Monta el carrito y el AuthModal la primera vez que se piden, y después los deja montados
 * (para que la animación de salida y la devolución del foco funcionen igual que siempre).
 */
export function LazyPanels() {
  const cartOpen = useCartStore((s) => s.isOpen)
  const authOpen = useAuthModalStore((s) => s.isOpen)
  const [cartWanted, setCartWanted] = useState(cartOpen)
  const [authWanted, setAuthWanted] = useState(authOpen)
  if (cartOpen && !cartWanted) setCartWanted(true)
  if (authOpen && !authWanted) setAuthWanted(true)

  return (
    <Suspense fallback={null}>
      {cartWanted && <CartDrawer />}
      {authWanted && <AuthModal />}
    </Suspense>
  )
}

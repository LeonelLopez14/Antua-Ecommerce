/**
 * El carrito (drawer) y el AuthModal se cargan recién la primera vez que se abren: así GSAP y
 * sus formularios no van en el chunk principal de todas las páginas. Para que no se note la
 * espera, se precargan apenas el puntero o el foco llegan a un botón que los abre.
 */
export const loadCartDrawer = () => import('../components/cart/CartDrawer')
export const loadAuthModal = () => import('../components/auth/AuthModal')

/** Props para un botón que abre el carrito: precarga en hover/foco (una sola vez, el navegador cachea). */
export const preloadCartProps = {
  onPointerEnter: () => void loadCartDrawer(),
  onFocus: () => void loadCartDrawer(),
}

export const preloadAuthProps = {
  onPointerEnter: () => void loadAuthModal(),
  onFocus: () => void loadAuthModal(),
}

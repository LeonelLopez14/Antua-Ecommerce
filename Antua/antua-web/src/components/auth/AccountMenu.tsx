import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, MapPin, Package, UserRound } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useAuthModalStore } from '../../stores/authModalStore'
import { useCartStore } from '../../stores/cartStore'

const MENU_ITEM =
  'flex min-h-11 w-full items-center gap-2 rounded-full px-3 font-bold transition-[background-color] duration-200 ease-out hover:bg-accent-secondary dark:hover:bg-dark-bg'

interface AccountMenuProps {
  buttonClassName: string
}

/**
 * Ícono de cuenta de la Navbar. Sin sesión abre el AuthModal; con sesión, un panel
 * (disclosure) con el nombre y "Cerrar sesión". Escape y clic afuera lo cierran.
 * Es siempre el mismo <button>: al cerrar sesión el foco no se pierde.
 */
export function AccountMenu({ buttonClassName }: AccountMenuProps) {
  const user = useAuthStore((s) => s.user)
  const loggedIn = useAuthStore((s) => s.token !== null)
  const clearSession = useAuthStore((s) => s.clearSession)
  const openAuth = useAuthModalStore((s) => s.open)
  const resetCart = useCartStore((s) => s.reset)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const expanded = loggedIn && open

  useEffect(() => {
    if (!expanded) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  const logout = () => {
    setOpen(false)
    clearSession()
    // Las páginas de la cuenta dejan de tener sentido sin sesión.
    if (pathname.startsWith('/cuenta')) navigate('/')
    // Sin sesión, el carrito vuelve a ser de invitado (uno nuevo): se recarga desde el backend.
    void resetCart()
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={loggedIn ? `Tu cuenta: ${user?.full_name ?? 'sesión iniciada'}` : 'Iniciar sesión o registrarte'}
        aria-haspopup={loggedIn ? undefined : 'dialog'}
        aria-expanded={loggedIn ? expanded : undefined}
        aria-controls={loggedIn ? panelId : undefined}
        onClick={(event) => (loggedIn ? setOpen((v) => !v) : openAuth('login', event.currentTarget))}
        className={`${buttonClassName} ${expanded ? 'bg-accent-secondary dark:bg-dark-card' : ''}`}
      >
        <UserRound aria-hidden="true" className={`size-5 ${loggedIn ? 'fill-current' : ''}`} />
      </button>
      {loggedIn && (
        <div
          id={panelId}
          hidden={!expanded}
          className="absolute top-full right-0 z-30 mt-2 w-64 rounded-card bg-surface p-4 shadow-lift dark:bg-dark-card dark:shadow-dark-float"
        >
          <p className="text-sm text-text-main/75 dark:text-dark-text-secondary">Hola,</p>
          <p className="truncate font-display text-lg font-semibold">{user?.full_name ?? 'de nuevo'}</p>
          {user?.email && (
            <p translate="no" className="truncate text-sm text-text-main/75 dark:text-dark-text-secondary">
              {user.email}
            </p>
          )}
          <ul className="mt-4 flex flex-col gap-1 border-t border-text-main/10 pt-3 dark:border-dark-text-main/10">
            <li>
              <Link to="/cuenta/pedidos" onClick={() => setOpen(false)} className={MENU_ITEM}>
                <Package aria-hidden="true" className="size-4" />
                Mis pedidos
              </Link>
            </li>
            <li>
              <Link to="/cuenta/direcciones" onClick={() => setOpen(false)} className={MENU_ITEM}>
                <MapPin aria-hidden="true" className="size-4" />
                Direcciones
              </Link>
            </li>
            <li>
              <Link to="/cuenta/perfil" onClick={() => setOpen(false)} className={MENU_ITEM}>
                <UserRound aria-hidden="true" className="size-4" />
                Perfil
              </Link>
            </li>
          </ul>
          <button type="button" onClick={logout} className={`mt-1 ${MENU_ITEM}`}>
            <LogOut aria-hidden="true" className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

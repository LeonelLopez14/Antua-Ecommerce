import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LockKeyhole, MapPin, Package, UserRound } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useAuthModalStore } from '../stores/authModalStore'
import { Button } from '../components/ui/Button'
import { ButtonLink } from '../components/ui/ButtonLink'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-2 rounded-full px-4 font-bold transition-[background-color,color] duration-200 ease-out ${
    isActive
      ? 'bg-accent-main text-bg dark:bg-dark-accent-main dark:text-dark-bg'
      : 'hover:bg-accent-secondary dark:hover:bg-dark-card'
  }`

/**
 * Rutas protegidas de /cuenta. Sin sesión abre el AuthModal y, al iniciar sesión,
 * muestra la misma ruta que se pidió (no hay redirección: la URL nunca cambia).
 */
export function AccountLayout() {
  const loggedIn = useAuthStore((s) => s.token !== null)
  const openAuth = useAuthModalStore((s) => s.open)

  // El modal se abre solo si nunca hubo sesión en esta visita: al cerrar sesión estando acá
  // (eso lleva a la Home) no se reabre. Suspense puede volver a correr el efecto; por eso se mira el estado.
  const [hadSession, setHadSession] = useState(loggedIn)
  if (loggedIn && !hadSession) setHadSession(true)
  useEffect(() => {
    if (!loggedIn && !hadSession) openAuth('login')
  }, [loggedIn, hadSession, openAuth])

  if (!loggedIn) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent-secondary dark:bg-dark-card">
          <LockKeyhole aria-hidden="true" className="size-8 text-accent-main dark:text-dark-accent-main" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold">Iniciá sesión para ver tu cuenta</h1>
        <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">
          Acá están tus pedidos y tus direcciones guardadas.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={(event) => openAuth('login', event.currentTarget)}>Iniciar sesión</Button>
          <ButtonLink to="/tienda" variant="secondary">
            Ver galletas
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.25rem,4vw,3rem)] leading-tight font-bold">Mi cuenta</h1>
      <nav aria-label="Secciones de la cuenta" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <NavLink to="/cuenta/pedidos" className={tabClass}>
              <Package aria-hidden="true" className="size-4" />
              Mis pedidos
            </NavLink>
          </li>
          <li>
            <NavLink to="/cuenta/direcciones" className={tabClass}>
              <MapPin aria-hidden="true" className="size-4" />
              Direcciones
            </NavLink>
          </li>
          <li>
            <NavLink to="/cuenta/perfil" className={tabClass}>
              <UserRound aria-hidden="true" className="size-4" />
              Perfil
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}

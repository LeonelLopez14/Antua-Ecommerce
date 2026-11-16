import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Package,
  ShieldX,
  Store,
  Tags,
  TicketPercent,
  Users,
  ScrollText,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useAuthModalStore } from '../../stores/authModalStore'
import { useCartStore } from '../../stores/cartStore'
import { usePageMeta } from '../../hooks/usePageMeta'
import { Logo } from '../../components/layout/Logo'
import { SkipLink } from '../../components/layout/SkipLink'
import { ThemeToggle } from '../../components/layout/ThemeToggle'
import { PageSkeleton } from '../../components/layout/PageSkeleton'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { iconButtonClasses } from '../../components/ui/buttonStyles'
import { Toaster } from '../../components/admin/Toaster'

const SECTIONS = [
  { to: '/admin', label: 'Resumen', Icon: LayoutDashboard, end: true },
  { to: '/admin/productos', label: 'Productos', Icon: Package },
  { to: '/admin/tags', label: 'Tags', Icon: Tags },
  { to: '/admin/cupones', label: 'Cupones', Icon: TicketPercent },
  { to: '/admin/pedidos', label: 'Pedidos', Icon: ClipboardList },
  { to: '/admin/resenas', label: 'Reseñas', Icon: MessageSquareText },
  { to: '/admin/usuarios', label: 'Usuarios', Icon: Users },
  { to: '/admin/auditoria', label: 'Auditoría', Icon: ScrollText },
] as const

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 font-bold whitespace-nowrap transition-[background-color,color] duration-200 ease-out ${
    isActive
      ? 'bg-accent-main text-bg dark:bg-dark-accent-main dark:text-dark-bg'
      : 'hover:bg-accent-secondary dark:hover:bg-dark-card'
  }`

/**
 * Mientras el panel está montado: no se indexa (meta robots; robots.txt también lo excluye) y
 * el encabezado fijo no tapa el elemento enfocado (scroll-padding-top).
 */
function useAdminDocument() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.append(meta)
    const root = document.documentElement
    const previous = root.style.scrollPaddingTop
    root.style.scrollPaddingTop = '5rem'
    return () => {
      meta.remove()
      root.style.scrollPaddingTop = previous
    }
  }, [])
}

function CenteredMessage({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <main id="contenido" className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <Logo className="mb-10" />
      <span className="flex size-16 items-center justify-center rounded-full bg-accent-secondary dark:bg-dark-card">{icon}</span>
      <h1 className="mt-6 font-display text-4xl font-bold">{title}</h1>
      {children}
    </main>
  )
}

/**
 * Panel de administración (/admin/*). Se carga en un chunk aparte, solo si alguien entra acá.
 * La verificación del rol es solo comodidad: la seguridad real la hace el backend en cada request.
 * - Sin sesión: abre el AuthModal y, al iniciar sesión, sigue en la misma URL.
 * - Con sesión de cliente: "No tenés permiso" (403).
 */
export default function AdminLayout() {
  useAdminDocument()
  const user = useAuthStore((s) => s.user)
  const loggedIn = useAuthStore((s) => s.token !== null)
  const clearSession = useAuthStore((s) => s.clearSession)
  const openAuth = useAuthModalStore((s) => s.open)
  const resetCart = useCartStore((s) => s.reset)
  const navigate = useNavigate()

  const [hadSession, setHadSession] = useState(loggedIn)
  if (loggedIn && !hadSession) setHadSession(true)
  useEffect(() => {
    if (!loggedIn && !hadSession) openAuth('login')
  }, [loggedIn, hadSession, openAuth])

  const role = user?.role
  usePageMeta(!loggedIn ? 'Iniciá sesión' : role === 'customer' ? 'Sin permiso' : 'Administración')

  if (!loggedIn) {
    return (
      <CenteredMessage icon={<LockKeyhole aria-hidden="true" className="size-8 text-accent-main dark:text-dark-accent-main" />} title="Iniciá sesión para administrar">
        <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">El panel es solo para el equipo de Antua.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={(event) => openAuth('login', event.currentTarget)}>Iniciar sesión</Button>
          <ButtonLink to="/" variant="secondary">
            Ir a la tienda
          </ButtonLink>
        </div>
      </CenteredMessage>
    )
  }

  // Sesión guardada antes de que existieran los roles: se espera a /auth/me (RootLayout).
  if (!role) {
    return (
      <main id="contenido" className="flex min-h-svh items-center justify-center px-4">
        <p role="status">Verificando permisos…</p>
      </main>
    )
  }

  if (role !== 'admin') {
    return (
      <CenteredMessage icon={<ShieldX aria-hidden="true" className="size-8 text-accent-main dark:text-dark-accent-main" />} title="No tenés permiso">
        <p className="mt-4 text-lg text-text-main/85 dark:text-dark-text-secondary">
          Tu cuenta no tiene acceso al panel de administración. Si creés que es un error, hablá con quien administra la tienda.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/">Ir a la tienda</ButtonLink>
          <ButtonLink to="/cuenta/pedidos" variant="secondary">
            Mis pedidos
          </ButtonLink>
        </div>
      </CenteredMessage>
    )
  }

  const logout = () => {
    clearSession()
    void resetCart()
    navigate('/')
  }

  return (
    <div className="min-h-svh bg-bg dark:bg-dark-bg">
      <SkipLink />
      <header className="sticky top-0 z-30 bg-surface/95 shadow-soft backdrop-blur dark:bg-dark-surface/95 dark:shadow-none">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="rounded-full bg-accent-secondary px-3 py-1 text-xs font-bold dark:bg-dark-card dark:text-dark-accent-main">Panel</span>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <p className="mr-2 hidden min-w-0 truncate text-sm md:block">
              <span className="text-text-main/75 dark:text-dark-text-secondary">Sesión de </span>
              <strong>{user.full_name}</strong>
            </p>
            <Link to="/" aria-label="Ver la tienda" title="Ver la tienda" className={iconButtonClasses()}>
              <Store aria-hidden="true" className="size-5" />
            </Link>
            <ThemeToggle className={iconButtonClasses()} />
            <button type="button" onClick={logout} className={`${iconButtonClasses()} sm:w-auto sm:gap-2 sm:px-4 sm:font-bold`}>
              <LogOut aria-hidden="true" className="size-5" />
              <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="lg:flex">
        <nav aria-label="Secciones del panel" className="border-b border-text-main/10 lg:sticky lg:top-[68px] lg:h-[calc(100svh-68px)] lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 dark:border-dark-text-main/10">
          <ul className="flex gap-1 overflow-x-auto px-4 py-3 lg:flex-col lg:overflow-visible lg:py-6">
            {SECTIONS.map(({ to, label, Icon, ...rest }) => (
              <li key={to}>
                <NavLink to={to} end={'end' in rest} className={navClass}>
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 scroll-mt-20 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  )
}

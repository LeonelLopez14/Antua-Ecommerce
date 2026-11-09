import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { login, register } from '../../api/auth'
import { AUTH_MESSAGES, authErrorsFrom, EMAIL_PATTERN, PASSWORD_MIN, type AuthErrors, type AuthField as FieldName } from '../../lib/authMessages'
import { useAuthModalStore, type AuthTab } from '../../stores/authModalStore'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import type { AuthResponse } from '../../types/auth'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'

const TABS: { id: AuthTab; label: string }[] = [
  { id: 'login', label: 'Iniciar sesión' },
  { id: 'register', label: 'Registrarme' },
]

const FIELD_ORDER: FieldName[] = ['fullName', 'email', 'password', 'confirmPassword']
/** Sufijo del id del input de cada campo (también es su `name`). */
const FIELD_INPUT: Record<FieldName, string> = {
  fullName: 'name',
  email: 'email',
  password: 'password',
  confirmPassword: 'confirm-password',
}
const NO_ERRORS: AuthErrors = { fields: {}, form: null }

const textOf = (data: FormData, name: string): string => {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Modal de cuenta (DESIGN.md §4 y wireframe del modal): un solo componente con tabs
 * "Iniciar sesión" / "Registrarme". Se abre desde la Navbar; nunca se fuerza en el checkout.
 */
export function AuthModal() {
  const isOpen = useAuthModalStore((s) => s.isOpen)
  const tab = useAuthModalStore((s) => s.tab)
  const setTab = useAuthModalStore((s) => s.setTab)
  const close = useAuthModalStore((s) => s.close)
  const returnFocusTo = useAuthModalStore((s) => s.returnFocusTo)
  const setSession = useAuthStore((s) => s.setSession)
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart)
  const reduced = usePrefersReducedMotion()

  const baseId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // `formKey` remonta los formularios (inputs no controlados) para reiniciarlos al cerrar.
  const [formKey, setFormKey] = useState(0)
  const [errors, setErrors] = useState<AuthErrors>(NO_ERRORS)
  const [pending, setPending] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)

  const resetForms = () => {
    setFormKey((k) => k + 1)
    setErrors(NO_ERRORS)
    setPending(false)
    setMergeError(null)
    setForgotOpen(false)
  }

  // Crossfade del contenido al cambiar de tab.
  useGSAP(
    () => {
      if (!panelRef.current) return
      gsap.fromTo(panelRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.1 : 0.25, ease: 'power1.out' })
    },
    { dependencies: [tab], revertOnUpdate: false },
  )

  const switchTab = (next: AuthTab, focusTab = false) => {
    if (next === tab) return
    setErrors(NO_ERRORS)
    setForgotOpen(false)
    setTab(next)
    if (focusTab) document.getElementById(`${baseId}-tab-${next}`)?.focus()
  }

  // Patrón de tabs de WAI-ARIA: flechas, Inicio y Fin mueven y activan.
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, AuthTab> = {
      ArrowRight: tab === 'login' ? 'register' : 'login',
      ArrowLeft: tab === 'login' ? 'register' : 'login',
      Home: 'login',
      End: 'register',
    }
    const next = keys[event.key]
    if (!next) return
    event.preventDefault()
    switchTab(next, true)
  }

  const showErrors = (next: AuthErrors) => {
    setErrors(next)
    const first = FIELD_ORDER.find((f) => next.fields[f])
    if (first) document.getElementById(id(FIELD_INPUT[first]))?.focus()
  }

  const finish = async (session: AuthResponse) => {
    setSession(session)
    const merged = await mergeGuestCart()
    setPending(false)
    if (merged.ok) close()
    else setMergeError(`Ya iniciaste sesión, pero no pudimos sumar tu carrito anterior: ${merged.error}`)
  }

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const email = textOf(data, 'email').trim()
    const password = textOf(data, 'password')
    const fields: AuthErrors['fields'] = {}
    if (!EMAIL_PATTERN.test(email)) fields.email = AUTH_MESSAGES.email
    if (!password) fields.password = AUTH_MESSAGES.password
    if (Object.keys(fields).length > 0) return showErrors({ fields, form: null })

    setErrors(NO_ERRORS)
    setPending(true)
    try {
      await finish(await login(email, password))
    } catch (error) {
      setPending(false)
      showErrors(authErrorsFrom(error, 'login'))
    }
  }

  const submitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const fullName = textOf(data, 'name').trim()
    const email = textOf(data, 'email').trim()
    const password = textOf(data, 'new-password')
    const confirm = textOf(data, 'confirm-password')
    const fields: AuthErrors['fields'] = {}
    if (!fullName) fields.fullName = AUTH_MESSAGES.fullName
    if (!EMAIL_PATTERN.test(email)) fields.email = AUTH_MESSAGES.email
    if (password.length < PASSWORD_MIN) fields.password = AUTH_MESSAGES.passwordMin
    if (confirm !== password) fields.confirmPassword = AUTH_MESSAGES.confirm
    if (Object.keys(fields).length > 0) return showErrors({ fields, form: null })

    setErrors(NO_ERRORS)
    setPending(true)
    try {
      await finish(await register(fullName, email, password))
    } catch (error) {
      setPending(false)
      showErrors(authErrorsFrom(error, 'register'))
    }
  }

  const id = (name: string) => `${baseId}-${tab}-${name}`
  const panelId = `${baseId}-panel`

  const tabs = (
    <div role="tablist" aria-label="Tu cuenta" className="flex rounded-full bg-accent-secondary p-1 dark:bg-dark-bg">
      {TABS.map((t) => {
        const selected = t.id === tab
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => switchTab(t.id)}
            onKeyDown={onTabKeyDown}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-bold transition-[background-color,color] duration-200 ease-out ${
              selected
                ? 'bg-accent-main text-bg dark:bg-dark-accent-main dark:text-dark-bg'
                : 'text-text-main hover:bg-bg/70 dark:text-dark-text-main dark:hover:bg-dark-card'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      onExited={resetForms}
      title={tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      hideTitle
      headerContent={tabs}
      placement="center"
      returnFocusTo={returnFocusTo}
    >
      <div ref={panelRef} id={panelId} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} key={`${tab}-${formKey}`}>
        {errors.form && (
          <p role="alert" className="mb-4 rounded-xl bg-accent-secondary px-4 py-3 text-sm font-bold dark:bg-dark-card dark:text-dark-accent-main">
            {errors.form}
          </p>
        )}
        {mergeError && (
          <div role="alert" className="mb-4 rounded-xl bg-accent-secondary px-4 py-3 text-sm dark:bg-dark-card">
            <p>{mergeError}</p>
            <Button variant="secondary" onClick={close} className="mt-3 min-h-9 px-4 py-2 text-sm">
              Seguir
            </Button>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={(e) => void submitLogin(e)} noValidate className="flex flex-col gap-4">
            <FormField
              id={id('email')}
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="nombre@mail.com…"
              error={errors.fields.email}
            />
            <FormField
              id={id('password')}
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              error={errors.fields.password}
              aside={
                // TODO(auth): no hay flujo de recuperación en el backend todavía; solo informa.
                <button
                  type="button"
                  onClick={() => setForgotOpen((v) => !v)}
                  aria-expanded={forgotOpen}
                  className="rounded-sm text-sm text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              }
            />
            {forgotOpen && (
              <p className="text-sm text-text-main/85 dark:text-dark-text-secondary">
                Pronto vas a poder recuperarla desde acá. Mientras tanto, escribinos a{' '}
                <a href="mailto:hola@antua.com.ar" className="font-bold underline underline-offset-4">
                  hola@antua.com.ar
                </a>
                .
              </p>
            )}
            <Button type="submit" loading={pending} className="mt-2 w-full">
              {pending ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
            {/* TODO(auth): "Continuar con Google" queda afuera hasta decidir el alcance (wireframe del modal). */}
            <p className="text-center text-sm">
              ¿No tenés cuenta?{' '}
              <button type="button" onClick={() => switchTab('register', true)} className="rounded-sm font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                Registrate
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={(e) => void submitRegister(e)} noValidate className="flex flex-col gap-4">
            <FormField
              id={id('name')}
              label="Nombre completo"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Ej.: Lucía Pérez…"
              error={errors.fields.fullName}
            />
            <FormField
              id={id('email')}
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="nombre@mail.com…"
              error={errors.fields.email}
            />
            <FormField
              id={id('password')}
              label="Contraseña"
              name="new-password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              error={errors.fields.password}
              hint={`Al menos ${PASSWORD_MIN} caracteres.`}
            />
            <FormField
              id={id('confirm-password')}
              label="Confirmar contraseña"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              error={errors.fields.confirmPassword}
            />
            <Button type="submit" loading={pending} className="mt-2 w-full">
              {pending ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
            <p className="text-center text-sm text-text-main/80 dark:text-dark-text-secondary">
              Al registrarte aceptás los términos y la política de privacidad.
            </p>
            <p className="text-center text-sm">
              ¿Ya tenés cuenta?{' '}
              <button type="button" onClick={() => switchTab('login', true)} className="rounded-sm font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                Iniciá sesión
              </button>
            </p>
          </form>
        )}
      </div>
    </Dialog>
  )
}

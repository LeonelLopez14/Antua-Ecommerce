import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { useResource } from '../hooks/useResource'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { fetchAddresses } from '../api/addresses'
import { claimGuestOrder, createOrder, fetchGuestOrder, fetchOrder } from '../api/orders'
import {
  CHECKOUT_STEPS,
  EMPTY_CHECKOUT_FORM,
  isCheckoutFormComplete,
  type CheckoutField,
  type CheckoutForm,
  type CheckoutStep,
} from '../lib/checkoutForm'
import { orderErrorFrom, type OrderError } from '../lib/orderMessages'
import { clearPlacedOrder, readPlacedOrder, writePlacedOrder } from '../lib/placedOrder'
import { orderSummaryLines, orderSummaryTotals } from '../lib/orderSummary'
import type { Address } from '../types/address'
import type { Order } from '../types/order'
import { CheckoutSteps } from '../components/checkout/CheckoutSteps'
import { CartWarnings } from '../components/cart/CartWarnings'
import { OrderSummary, type SummaryLine, type SummaryTotals } from '../components/checkout/OrderSummary'
import { AddressStep, type AddressChoice } from '../components/checkout/AddressStep'
import { ShippingStep } from '../components/checkout/ShippingStep'
import { PaymentStep } from '../components/checkout/PaymentStep'
import { ConfirmStep } from '../components/checkout/ConfirmStep'
import { OrderPlaced } from '../components/checkout/OrderPlaced'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { ButtonLink } from '../components/ui/ButtonLink'
import { skeletonBar } from '../components/ui/skeleton'

const parseStep = (value: string | null): CheckoutStep => {
  const step = Number(value)
  return step === 2 || step === 3 || step === 4 ? step : 1
}

/** Aviso que recibe la Tienda (location.state.notice) cuando se entra al checkout con el carrito vacío. */
const EMPTY_CART_NOTICE = 'Tu carrito está vacío: elegí tus galletas y después volvé al checkout.'

/**
 * Checkout en 4 pasos (DESIGN.md §4): Dirección → Envío → Pago → Confirmación.
 * - El paso vive en la URL (?paso=2), así funciona el botón Atrás del navegador.
 * - Guest checkout: nunca se exige sesión ni se fuerza el AuthModal.
 * - Los montos salen del backend (carrito antes de confirmar; pedido después).
 * - El pedido creado se recuerda en sessionStorage: recargar muestra la confirmación y no lo duplica.
 */
export default function Checkout() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const step = parseStep(params.get('paso'))

  const user = useAuthStore((s) => s.user)
  const loggedIn = useAuthStore((s) => s.token !== null)
  const isGuest = !loggedIn
  const cart = useCartStore((s) => s.cart)
  const summary = useCartStore((s) => s.summary)
  const cartStatus = useCartStore((s) => s.status)
  const cartError = useCartStore((s) => s.loadError)
  const loadCart = useCartStore((s) => s.load)

  // ---- Pedido ya creado (recarga de la confirmación) ----
  const [placedRef] = useState(() => (step === 4 ? readPlacedOrder() : null))
  const [placed, setPlaced] = useState<Order | null>(null)
  const reloaded = useResource(placedRef ? `pedido-${placedRef.id}` : null, (signal) =>
    placedRef?.accessToken ? fetchGuestOrder(placedRef.id, placedRef.accessToken, signal) : fetchOrder(placedRef?.id ?? 0, signal),
  )
  const placedOrder = placed ?? (reloaded.state.status === 'ready' ? reloaded.state.data : null)
  const [accessToken, setAccessToken] = useState(placedRef?.accessToken ?? null)
  const inPlacedFlow = placed !== null || placedRef !== null

  // Entrar a un checkout nuevo descarta la confirmación anterior y trae el carrito fresco.
  useEffect(() => {
    if (!placedRef) {
      clearPlacedOrder()
      void loadCart()
    }
  }, [placedRef, loadCart])

  // ---- Formulario ----
  const [form, setForm] = useState<CheckoutForm>(EMPTY_CHECKOUT_FORM)
  const [dirty, setDirty] = useState(false)
  const [choice, setChoice] = useState<AddressChoice>('new')

  // Con sesión, nombre y teléfono salen de la cuenta (se pueden cambiar).
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null)
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id)
    setForm((f) => ({ ...f, fullName: f.fullName || user.full_name, phone: f.phone || (user.phone ?? '') }))
  }

  const addresses = useResource(loggedIn ? `direcciones-${user?.id ?? ''}` : null, fetchAddresses)

  const applyAddress = (address: Address) => {
    setChoice(address.id)
    setForm((f) => ({ ...f, street: address.street, city: address.city, postalCode: address.postal_code }))
  }

  // Al llegar las direcciones guardadas, se elige la predeterminada (una sola vez).
  const [autoChosen, setAutoChosen] = useState(false)
  if (!autoChosen && addresses.state.status === 'ready') {
    setAutoChosen(true)
    const preferred = addresses.state.data.find((a) => a.is_default) ?? addresses.state.data[0]
    if (preferred) applyAddress(preferred)
  }

  const chooseAddress = (next: AddressChoice, keepValues = false) => {
    if (next === 'new') {
      setChoice('new')
      if (!keepValues) setForm((f) => ({ ...f, street: '', city: '', postalCode: '' }))
      return
    }
    const address = addresses.state.status === 'ready' ? addresses.state.data.find((a) => a.id === next) : undefined
    if (address) applyAddress(address)
  }

  const changeField = (field: CheckoutField, value: string) => {
    setDirty(true)
    setForm((f) => ({ ...f, [field]: value }))
  }

  const formComplete = isCheckoutFormComplete(form, isGuest)
  const goTo = useCallback((next: CheckoutStep, replace = false) => setParams({ paso: String(next) }, { replace }), [setParams])

  // ---- Guardas ----
  // Sin los datos del paso 1 no se puede estar en los siguientes (ej.: recargar en ?paso=3).
  useEffect(() => {
    if (!inPlacedFlow && step > 1 && !formComplete) goTo(1, true)
  }, [inPlacedFlow, step, formComplete, goTo])

  const cartEmpty = cartStatus === 'ready' && (cart?.items.length ?? 0) === 0
  useEffect(() => {
    if (!inPlacedFlow && cartEmpty) navigate('/tienda', { replace: true, state: { notice: EMPTY_CART_NOTICE } })
  }, [inPlacedFlow, cartEmpty, navigate])

  // ---- Aviso antes de salir con datos sin guardar ----
  const guardLeave = dirty && !inPlacedFlow && !cartEmpty
  const blocker = useBlocker(({ currentLocation, nextLocation }) => guardLeave && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!guardLeave) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [guardLeave])

  // ---- Crear el pedido ----
  const placingRef = useRef(false)
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState<OrderError | null>(null)

  const place = async () => {
    // Doble clic: la segunda llamada se ignora mientras la primera está en curso.
    if (placingRef.current) return
    placingRef.current = true
    setPlacing(true)
    setOrderError(null)
    try {
      const { order, accessToken: token } = await createOrder({
        guest_email: isGuest ? form.email.trim() : undefined,
        shipping_full_name: form.fullName.trim(),
        shipping_phone: form.phone.trim(),
        shipping_street: form.street.trim(),
        shipping_city: form.city.trim(),
        shipping_postal_code: form.postalCode.trim(),
      })
      writePlacedOrder({ id: order.id, accessToken: token })
      setAccessToken(token)
      setPlaced(order)
      // El backend vació el carrito: se refleja en la Navbar.
      void loadCart()
    } catch (error) {
      const translated = orderErrorFrom(error)
      setOrderError(translated)
      // Stock o cupón: el carrito cambió en el backend, se trae de nuevo para que el resumen sea real.
      if (translated.reviewCart) void loadCart()
    } finally {
      placingRef.current = false
      setPlacing(false)
    }
  }

  // ---- Pedido de invitado → cuenta ----
  // Al crear la cuenta (o iniciar sesión) desde la confirmación se vincula SOLO este pedido, con su token.
  const claimingRef = useRef(false)
  const [claimNotice, setClaimNotice] = useState('')
  const placedOrderId = placedOrder?.id ?? null
  useEffect(() => {
    if (!loggedIn || !accessToken || placedOrderId === null || claimingRef.current) return
    claimingRef.current = true
    claimGuestOrder(placedOrderId, accessToken)
      .then((order) => {
        setPlaced(order)
        setClaimNotice('Guardamos este pedido en tu cuenta.')
      })
      .catch(() => setClaimNotice('No pudimos guardar este pedido en tu cuenta, pero el pedido está registrado.'))
      .finally(() => {
        setAccessToken(null)
        writePlacedOrder({ id: placedOrderId, accessToken: null })
      })
  }, [loggedIn, accessToken, placedOrderId])

  // ---- Foco y scroll al cambiar de paso ----
  const headingRef = useRef<HTMLHeadingElement>(null)
  const viewKey = placedOrder ? 'placed' : String(step)
  // La primera vez no se mueve el foco (el lector arranca por el skip link y el h1).
  const lastView = useRef(viewKey)
  useEffect(() => {
    if (lastView.current === viewKey) return
    lastView.current = viewKey
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [viewKey])

  usePageMeta(
    placedOrder ? `Pedido #${placedOrder.id} confirmado` : `Checkout: ${CHECKOUT_STEPS[step - 1] ?? ''}`,
    'Finalizá tu compra en Antua: dirección, envío y confirmación. No hace falta una cuenta.',
  )

  // ---- Resumen (idéntico en los 4 pasos) ----
  let lines: SummaryLine[] = []
  let totals: SummaryTotals | null = null
  let couponCode: string | null = null
  if (placedOrder) {
    lines = orderSummaryLines(placedOrder)
    totals = orderSummaryTotals(placedOrder)
    couponCode = placedOrder.couponCode
  } else if (cart && summary) {
    lines = cart.items.map((item) => ({
      key: item.id,
      name: item.product?.name ?? 'Galleta',
      variantName: item.variant.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      imageUrl: item.product?.imageUrl ?? null,
    }))
    totals = summary
    couponCode = cart.couponCode
  }

  // ---- Estados de carga y error ----
  if (placedRef && !placed) {
    if (reloaded.state.status === 'error') {
      return (
        <CheckoutShell title="Tu pedido">
          {reloaded.state.notFound ? (
            <EmptyState
              headingLevel={2}
              title="No encontramos ese pedido"
              message="Puede que ya hayas cerrado la confirmación. Si hiciste el pedido, te llega el detalle por email."
              action={<ButtonLink to="/tienda">Ver galletas</ButtonLink>}
            />
          ) : (
            <ErrorState headingLevel={2} title="No pudimos mostrar tu pedido" message={reloaded.state.message} onRetry={reloaded.retry} />
          )}
        </CheckoutShell>
      )
    }
    if (!placedOrder) return <CheckoutSkeleton />
  }

  if (!placedOrder) {
    if (cartStatus === 'error' && !cart) {
      return (
        <CheckoutShell title="Finalizar compra">
          <ErrorState headingLevel={2} title="No pudimos cargar tu carrito" message={cartError ?? 'Probá de nuevo en un rato.'} onRetry={() => void loadCart()} />
        </CheckoutShell>
      )
    }
    if (!cart || !summary || cartEmpty) return <CheckoutSkeleton />
  }

  const stepLabel = CHECKOUT_STEPS[step - 1] ?? ''
  const email = isGuest ? form.email.trim() || null : (user?.email ?? null)

  return (
    <CheckoutShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-bold">
            {placedOrder ? '¡Gracias por tu pedido!' : 'Finalizar compra'}
          </h1>
          <CheckoutSteps current={placedOrder ? 4 : step} reachable={formComplete ? 4 : 1} locked={placedOrder !== null} />

          {totals && <OrderSummary variant="collapsible" lines={lines} couponCode={couponCode} totals={totals} />}

          {!placedOrder && <CartWarnings />}

          <section aria-labelledby="paso-title" className="rounded-card bg-surface p-6 shadow-soft sm:p-8 dark:bg-dark-surface dark:shadow-none">
            {/* Destino del foco al cambiar de paso (no es interactivo): el subrayado reemplaza al outline. */}
            <h2
              id="paso-title"
              ref={headingRef}
              tabIndex={-1}
              className="mb-6 font-display text-2xl font-semibold decoration-accent-main decoration-2 underline-offset-8 focus-visible:underline focus-visible:outline-none dark:decoration-dark-accent-main"
            >
              {placedOrder ? 'Pedido confirmado' : `Paso ${step} de 4: ${stepLabel}`}
            </h2>

            {placedOrder ? (
              <OrderPlaced order={placedOrder} isGuest={placedOrder.guestEmail !== null} claimNotice={claimNotice} />
            ) : step === 1 ? (
              <AddressStep
                form={form}
                onChange={changeField}
                isGuest={isGuest}
                addresses={addresses.state}
                choice={choice}
                onChoose={chooseAddress}
                onContinue={() => goTo(2)}
              />
            ) : step === 2 ? (
              <ShippingStep shipping={summary?.shipping ?? null} etaDays={summary?.shippingEtaDays ?? null} />
            ) : step === 3 ? (
              <PaymentStep />
            ) : (
              <ConfirmStep
                form={form}
                email={email}
                shipping={summary?.shipping ?? null}
                placing={placing}
                error={orderError}
                onPlace={() => void place()}
              />
            )}
          </section>
        </div>

        {totals && <OrderSummary variant="panel" lines={lines} couponCode={couponCode} totals={totals} />}
      </div>

      {/* Aviso antes de salir con datos sin guardar (DESIGN.md §11, Formularios). */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="¿Salís del checkout?"
        confirmLabel="Salir"
        cancelLabel="Seguir con mi pedido"
        safeFirst
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>Los datos que escribiste no se guardan. Tu carrito sí queda como está.</p>
      </ConfirmDialog>
    </CheckoutShell>
  )
}

/** `title`: en los estados de error y carga, la página igual necesita su h1 (jerarquía de encabezados). */
function CheckoutShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      {title && <h1 className="mb-6 font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-bold">{title}</h1>}
      {children}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <CheckoutShell>
      <p role="status" className="sr-only">
        Cargando el checkout…
      </p>
      <div aria-hidden="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-6">
          <div className={`h-10 w-64 ${skeletonBar}`} />
          <div className={`h-12 w-full ${skeletonBar}`} />
          <div className="flex flex-col gap-4 rounded-card bg-surface p-8 dark:bg-dark-surface">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-11 w-full ${skeletonBar}`} />
            ))}
          </div>
        </div>
        <div className="hidden h-80 rounded-card bg-accent-secondary motion-safe:animate-pulse lg:block dark:bg-dark-card" />
      </div>
    </CheckoutShell>
  )
}

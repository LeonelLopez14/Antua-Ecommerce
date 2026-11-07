import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { getFocusable, useFocusTrap } from '../../hooks/useFocusTrap'
import { iconButtonClasses } from './buttonStyles'

export type DialogPlacement = 'left' | 'right' | 'center'

export interface DialogProps {
  open: boolean
  onClose: () => void
  /** Nombre accesible del diálogo. */
  title: string
  /** Oculta el título visualmente (sigue disponible para lectores de pantalla). */
  hideTitle?: boolean
  /** Contenido extra del encabezado, junto al botón de cerrar (ej.: tabs). */
  headerContent?: ReactNode
  placement?: DialogPlacement
  /** Elemento al que vuelve el foco al cerrar. Por defecto, el que tenía el foco al abrir. */
  returnFocusTo?: HTMLElement | null
  /** Zona fija abajo (totales, CTA). */
  footer?: ReactNode
  /** Se llama cuando terminó la animación de salida (para reiniciar formularios). */
  onExited?: () => void
  children: ReactNode
}

const DURATION_IN = 0.3
const DURATION_OUT = 0.22
const DURATION_FADE = 0.15

const panelPlacement: Record<DialogPlacement, string> = {
  right: 'absolute inset-y-0 right-0 w-full max-w-md',
  left: 'absolute inset-y-0 left-0 w-full max-w-md',
  center: 'relative m-auto w-full max-w-md max-h-[calc(100svh-2rem)] rounded-modal',
}

/**
 * Base de los paneles modales (drawer de filtros, carrito, AuthModal).
 * - role="dialog" + aria-modal, foco atrapado, Escape y clic en el overlay cierran,
 *   el foco vuelve al disparador, el fondo no scrollea, overscroll-behavior: contain.
 * - GSAP: drawer = slide; centro = fade + escala leve; overlay = fade.
 *   Con reduced motion, solo un fade corto. Anima únicamente transform y opacity.
 * - Se mantiene montado mientras dura la animación de salida.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  headerContent,
  placement = 'right',
  returnFocusTo,
  footer,
  onExited,
  children,
}: DialogProps) {
  const reduced = usePrefersReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onExitedRef = useRef(onExited)

  useEffect(() => {
    onExitedRef.current = onExited
  }, [onExited])

  // Montado = abierto o cerrándose. Se ajusta durante el render (patrón de React para estado derivado).
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  useFocusTrap(panelRef, open)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const overlay = overlayRef.current
    if (!mounted || !panel || !overlay) return
    // Los drawers se deslizan ya opacos (el panel arranca con opacity-0 en las clases); el modal además funde.
    const offscreen =
      placement === 'right'
        ? { xPercent: 100, opacity: 1 }
        : placement === 'left'
          ? { xPercent: -100, opacity: 1 }
          : { y: 16, scale: 0.97, opacity: 0 }
    const onscreen = placement === 'center' ? { y: 0, scale: 1, opacity: 1 } : { xPercent: 0, opacity: 1 }

    if (open) {
      previousFocus.current ??= document.activeElement instanceof HTMLElement ? document.activeElement : null
      const tl = gsap.timeline()
      tl.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? DURATION_FADE : DURATION_IN, ease: 'power1.out' }, 0)
      // El panel queda `visible` desde el primer frame: si no, el foco inicial no se puede mover adentro.
      if (reduced) tl.fromTo(panel, { opacity: 0, visibility: 'visible' }, { opacity: 1, duration: DURATION_FADE }, 0)
      else tl.fromTo(panel, { ...offscreen, visibility: 'visible' }, { ...onscreen, duration: DURATION_IN, ease: 'power3.out' }, 0)
      const [first] = getFocusable(panel)
      ;(first ?? panel).focus({ preventScroll: true })
      return () => {
        tl.kill()
      }
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setMounted(false)
        onExitedRef.current?.()
        const target = returnFocusTo ?? previousFocus.current
        previousFocus.current = null
        target?.focus({ preventScroll: true })
      },
    })
    tl.to(overlay, { autoAlpha: 0, duration: reduced ? DURATION_FADE : DURATION_OUT, ease: 'power1.in' }, 0)
    if (reduced) tl.to(panel, { opacity: 0, duration: DURATION_FADE }, 0)
    else tl.to(panel, { ...offscreen, duration: DURATION_OUT, ease: 'power2.in' }, 0)
    return () => {
      tl.kill()
    }
  }, [open, mounted, reduced, placement, returnFocusTo])

  // Escape cierra y el fondo no scrollea mientras el panel está abierto.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      root.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div className={`fixed inset-0 z-50 ${placement === 'center' ? 'flex p-4' : ''}`}>
      {/* Atajo de mouse: el teclado tiene Escape y el botón Cerrar. */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        onClick={onClose}
        className="invisible absolute inset-0 bg-text-main/50 opacity-0 dark:bg-dark-bg/75"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${panelPlacement[placement]} invisible flex flex-col bg-surface text-text-main opacity-0 shadow-lift dark:bg-dark-surface dark:text-dark-text-main dark:shadow-dark-float`}
      >
        <div
          className={`flex items-center justify-between gap-4 px-6 py-4 ${
            placement === 'center' ? 'pb-0' : 'border-b border-text-main/10 dark:border-dark-text-main/10'
          }`}
        >
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'font-display text-2xl font-semibold'}>
            {title}
          </h2>
          {headerContent && <div className="min-w-0 flex-1">{headerContent}</div>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={iconButtonClasses()}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">{children}</div>
        {footer && (
          <div className="border-t border-text-main/10 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-dark-text-main/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

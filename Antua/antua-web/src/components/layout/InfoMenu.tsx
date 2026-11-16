import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { infoPages } from '../../data/infoPages'

const ITEM =
  'flex min-h-11 w-full items-center rounded-full px-3 font-bold transition-[background-color] duration-200 ease-out hover:bg-accent-secondary dark:hover:bg-dark-bg'

/**
 * "Ayuda" en la Navbar de escritorio: las cinco páginas institucionales en un panel (disclosure,
 * igual que el menú de cuenta). Escape y clic afuera lo cierran y devuelven el foco al botón.
 * En mobile están en el menú principal.
 */
export function InfoMenu({ buttonClassName }: { buttonClassName: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
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
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`${buttonClassName} inline-flex items-center gap-1 ${open ? 'bg-accent-secondary dark:bg-dark-card' : ''}`}
      >
        Ayuda
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full left-0 z-30 mt-2 w-64 rounded-card bg-surface p-3 shadow-lift dark:bg-dark-card dark:shadow-dark-float"
      >
        <ul className="flex flex-col gap-1">
          {infoPages.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} onClick={() => setOpen(false)} className={ITEM}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

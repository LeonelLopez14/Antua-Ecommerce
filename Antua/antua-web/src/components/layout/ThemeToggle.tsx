import { Monitor, Moon, Sun } from 'lucide-react'
import { useThemeStore, type ThemePreference } from '../../stores/themeStore'

const LABEL: Record<ThemePreference, string> = { system: 'el del sistema', light: 'claro', dark: 'oscuro' }
const NEXT_LABEL: Record<ThemePreference, string> = { system: 'claro', light: 'oscuro', dark: 'el del sistema' }
const ICON = { system: Monitor, light: Sun, dark: Moon } as const

/** Botón de tema en la Navbar: sistema → claro → oscuro. El nombre accesible dice el actual y el próximo. */
export function ThemeToggle({ className }: { className: string }) {
  const preference = useThemeStore((s) => s.preference)
  const cycle = useThemeStore((s) => s.cycle)
  const Icon = ICON[preference]

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema: ${LABEL[preference]}. Cambiar a ${NEXT_LABEL[preference]}`}
      title={`Tema: ${LABEL[preference]}`}
      className={className}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}

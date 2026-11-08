import { create } from 'zustand'

export type ThemePreference = 'system' | 'light' | 'dark'

/** Misma clave que el script de index.html, que aplica el tema antes del primer pintado. */
const KEY = 'antua.theme'

/** Color de fondo de cada tema, leído de los tokens de index.css (bg y dark-bg). */
const themeColor = (theme: 'light' | 'dark'): string =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(theme === 'dark' ? '--color-dark-bg' : '--color-bg')
    .trim()

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function savePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, preference)
  } catch {
    // Sin storage, el tema elegido dura hasta recargar.
  }
}

/**
 * Aplica el tema: clase .dark/.light en <html> (la usa `@custom-variant dark` de index.css)
 * y `theme-color` acorde. Con "system" se quitan las clases y cada meta vuelve a su media query.
 */
function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement
  root.classList.toggle('dark', preference === 'dark')
  root.classList.toggle('light', preference === 'light')
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const media = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = themeColor(preference === 'system' ? media : preference)
  }
}

interface ThemeState {
  preference: ThemePreference
  /** Sistema → claro → oscuro → sistema. */
  cycle: () => void
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  preference: readPreference(),
  cycle: () => {
    const next = NEXT[get().preference]
    savePreference(next)
    applyPreference(next)
    set({ preference: next })
  },
}))

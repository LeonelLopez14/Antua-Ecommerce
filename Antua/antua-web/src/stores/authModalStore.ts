import { create } from 'zustand'

export type AuthTab = 'login' | 'register'

interface AuthModalState {
  isOpen: boolean
  tab: AuthTab
  /** Elemento que abrió el modal, para devolverle el foco. */
  returnFocusTo: HTMLElement | null
  /** Aviso arriba del formulario (ej.: "Tu sesión venció"). */
  notice: string | null
  open: (tab?: AuthTab, trigger?: HTMLElement | null, notice?: string | null) => void
  close: () => void
  setTab: (tab: AuthTab) => void
}

/** Estado del AuthModal: un solo modal con dos tabs (DESIGN.md §4). Nunca se fuerza en el checkout. */
export const useAuthModalStore = create<AuthModalState>()((set) => ({
  isOpen: false,
  tab: 'login',
  returnFocusTo: null,
  notice: null,
  open: (tab = 'login', trigger = null, notice = null) => set({ isOpen: true, tab, returnFocusTo: trigger, notice }),
  close: () => set({ isOpen: false, notice: null }),
  setTab: (tab) => set({ tab }),
}))

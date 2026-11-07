import { create } from 'zustand'

export type AuthTab = 'login' | 'register'

interface AuthModalState {
  isOpen: boolean
  tab: AuthTab
  /** Elemento que abrió el modal, para devolverle el foco. */
  returnFocusTo: HTMLElement | null
  open: (tab?: AuthTab, trigger?: HTMLElement | null) => void
  close: () => void
  setTab: (tab: AuthTab) => void
}

/** Estado del AuthModal: un solo modal con dos tabs (DESIGN.md §4). Nunca se fuerza en el checkout. */
export const useAuthModalStore = create<AuthModalState>()((set) => ({
  isOpen: false,
  tab: 'login',
  returnFocusTo: null,
  open: (tab = 'login', trigger = null) => set({ isOpen: true, tab, returnFocusTo: trigger }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ tab }),
}))

import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, tone?: Toast['tone']) => void
  dismiss: (id: number) => void
}

let nextId = 1
const VISIBLE_MS = 7000

/** Mensajes de resultado del panel ("Producto guardado"). Los anuncia Toaster con aria-live. */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, tone = 'success') => {
    const id = nextId++
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone }] })
    window.setTimeout(() => get().dismiss(id), VISIBLE_MS)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))

export const toast = (message: string, tone?: Toast['tone']) => useToastStore.getState().show(message, tone)

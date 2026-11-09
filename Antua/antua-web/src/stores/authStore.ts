import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthResponse, User } from '../types/auth'
import { fetchMe } from '../api/auth'
import { isAxiosError } from 'axios'

interface AuthState {
  token: string | null
  user: User | null
  /** Guardar la sesión que devuelve POST /auth/login o /auth/register. */
  setSession: (session: AuthResponse) => void
  clearSession: () => void
  /** Al iniciar la app: si el token venció (401), se descarta para no operar con una sesión muerta. */
  verifySession: () => Promise<void>
}

/**
 * Sesión del usuario. Se persiste en localStorage (createJSONStorage tolera que no exista).
 * Al iniciar sesión, el AuthModal llama a cartStore.mergeGuestCart (POST /cart/merge).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      verifySession: async () => {
        if (!get().token) return
        try {
          set({ user: await fetchMe() })
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 401) set({ token: null, user: null })
        }
      },
    }),
    {
      name: 'antua.auth',
      storage: createJSONStorage(() => window.localStorage),
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
)

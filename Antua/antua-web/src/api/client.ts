import axios, { AxiosHeaders, isAxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { readGuestToken, writeGuestToken } from '../lib/guestToken'

const GUEST_HEADER = 'X-Guest-Token'

/**
 * Cliente HTTP de Antua.
 * baseURL: VITE_API_URL (ver .env.example). En desarrollo se usa `/api`, que Vite
 * reenvía a VITE_API_URL (vite.config.ts), porque la API todavía no habilita CORS.
 */
export const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL,
  timeout: 10000,
})

// Con sesión: JWT. Sin sesión: el token de invitado, si existe.
api.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers)
  const jwt = useAuthStore.getState().token
  const guestToken = readGuestToken()

  if (jwt) headers.set('Authorization', `Bearer ${jwt}`)
  else if (guestToken) headers.set(GUEST_HEADER, guestToken)

  config.headers = headers
  return config
})

// El backend crea el carrito de invitado y devuelve su token en este header.
// En producción requiere CORS con `exposedHeaders: ['X-Guest-Token']`.
api.interceptors.response.use((response) => {
  // Axios normaliza los nombres de header a minúsculas.
  const token: unknown = response.headers[GUEST_HEADER.toLowerCase()]
  if (typeof token === 'string' && token.length > 0) writeGuestToken(token)
  return response
})

/** Mensaje legible del error de la API (NestJS devuelve `message` como string o string[]). */
export function getApiErrorMessage(error: unknown, fallback = 'Algo salió mal. Probá de nuevo en un rato.'): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    if (!error.response) return 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'
    // Los 5xx traen mensajes técnicos (y en inglés): no sirven para quien compra.
    if (error.response.status >= 500) return fallback
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(' ')
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

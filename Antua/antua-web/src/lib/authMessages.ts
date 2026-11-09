import { isAxiosError } from 'axios'

export type AuthField = 'fullName' | 'email' | 'password' | 'confirmPassword'

export interface AuthErrors {
  fields: Partial<Record<AuthField, string>>
  /** Error general (conexión, servidor). */
  form: string | null
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PASSWORD_MIN = 8

/** Mensajes de validación compartidos entre la validación del cliente y la traducción de errores del backend. */
export const AUTH_MESSAGES = {
  fullName: 'Escribí tu nombre completo.',
  email: 'Escribí un email válido, por ejemplo nombre@mail.com.',
  password: 'Escribí tu contraseña.',
  passwordMin: `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`,
  confirm: 'Las contraseñas no coinciden.',
} as const

const NETWORK = 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'
const SERVER = 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.'

/**
 * Traduce los errores de /auth a mensajes accionables en español, ubicados junto al campo.
 * El backend responde: 401 "Credenciales incorrectas.", 409 "Email ya registrado."
 * y 400 con los mensajes de class-validator (en inglés) en un array.
 */
export function authErrorsFrom(error: unknown, mode: 'login' | 'register'): AuthErrors {
  if (!isAxiosError<{ message?: string | string[] }>(error)) return { fields: {}, form: SERVER }
  const response = error.response
  if (!response) return { fields: {}, form: NETWORK }
  if (response.status >= 500) return { fields: {}, form: SERVER }

  if (response.status === 401) {
    return { fields: { password: 'El email o la contraseña no coinciden. Revisalos y probá de nuevo.' }, form: null }
  }
  if (response.status === 409) {
    return { fields: { email: 'Ya hay una cuenta con este email. Iniciá sesión o usá otro.' }, form: null }
  }

  const raw = response.data?.message
  const messages = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  const fields: AuthErrors['fields'] = {}
  for (const message of messages) {
    if (/full_name/i.test(message)) fields.fullName = AUTH_MESSAGES.fullName
    else if (/email/i.test(message)) fields.email = AUTH_MESSAGES.email
    else if (/password/i.test(message)) {
      fields.password = mode === 'register' && /8|longer/i.test(message) ? AUTH_MESSAGES.passwordMin : AUTH_MESSAGES.password
    }
  }
  return Object.keys(fields).length > 0 ? { fields, form: null } : { fields: {}, form: messages[0] ?? SERVER }
}

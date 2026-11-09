import { api } from './client'
import type { AuthResponse, User } from '../types/auth'

/** POST /auth/login → { user, token }. 401 "Credenciales incorrectas." si no coinciden. */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

/** POST /auth/register → { user, token }. 409 si el email ya existe; 400 si falla la validación (password ≥ 8). */
export async function register(fullName: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { full_name: fullName, email, password })
  return data
}

/** GET /auth/me (requiere JWT): sirve para descartar un token vencido al iniciar la app. */
export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

/** POST /auth/change-password (JWT): 401 si la actual no coincide. Devuelve un JWT nuevo; los anteriores dejan de valer. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/change-password', { currentPassword, newPassword })
  return data
}

/** PATCH /users/me (JWT): nombre y teléfono. El email no se puede cambiar. */
export async function updateProfile(fullName: string, phone: string): Promise<User> {
  const { data } = await api.patch<User>('/users/me', { full_name: fullName, phone })
  return data
}

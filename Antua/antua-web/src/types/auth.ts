/** Usuario que devuelve antua-api (password_hash viene excluido). */
export interface User {
  id: number
  full_name: string
  email: string
  phone: string | null
  created_at: string
}

/** POST /auth/login y POST /auth/register. */
export interface AuthResponse {
  user: User
  token: string
}

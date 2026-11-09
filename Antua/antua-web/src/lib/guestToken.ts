const KEY = 'antua.guestToken'

/** localStorage puede no estar disponible (modo privado, cookies bloqueadas): nunca debe romper la app. */
export function readGuestToken(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function writeGuestToken(token: string): void {
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    // Sin storage, el carrito de invitado vive solo durante la sesión de la pestaña.
  }
}

export function clearGuestToken(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nada que limpiar.
  }
}

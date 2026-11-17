import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getApiErrorMessage, SESSION_EXPIRED } from './client'

const unauthorized = (url: string, withJwt: boolean, message: string) =>
  new AxiosError('401', '401', { url, headers: new AxiosHeaders(withJwt ? { Authorization: 'Bearer x' } : {}) }, undefined, {
    status: 401,
    statusText: 'Unauthorized',
    data: { message },
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe('getApiErrorMessage con 401', () => {
  it('una request con sesión rechazada es "sesión vencida", nunca "Unauthorized"', () => {
    expect(getApiErrorMessage(unauthorized('/orders', true, 'Unauthorized'))).toBe(SESSION_EXPIRED)
  })

  it('el login y el cambio de contraseña conservan su mensaje (no es una sesión vencida)', () => {
    expect(getApiErrorMessage(unauthorized('/auth/login', false, 'Credenciales incorrectas.'))).toBe('Credenciales incorrectas.')
    expect(getApiErrorMessage(unauthorized('/auth/change-password', true, 'La contraseña actual no coincide.'))).toBe(
      'La contraseña actual no coincide.',
    )
  })
})

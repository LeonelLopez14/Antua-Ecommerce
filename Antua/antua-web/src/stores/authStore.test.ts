import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import * as authApi from '../api/auth'
import { useAuthStore } from './authStore'
import type { User } from '../types/auth'

vi.mock('../api/auth', () => ({ fetchMe: vi.fn(), login: vi.fn(), register: vi.fn() }))

const user: User = { id: 7, full_name: 'Ana Pérez', email: 'ana@antua.test', phone: null, created_at: '2026-11-01T10:00:00Z' }

const httpError = (status: number) =>
  new AxiosError('error', String(status), undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('guarda la sesión y la persiste en localStorage', () => {
    useAuthStore.getState().setSession({ token: 'jwt-1', user })

    expect(useAuthStore.getState().token).toBe('jwt-1')
    expect(window.localStorage.getItem('antua.auth')).toContain('jwt-1')
  })

  it('cerrar sesión limpia el token y el usuario', () => {
    useAuthStore.getState().setSession({ token: 'jwt-1', user })
    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null })
  })

  it('descarta un token vencido (401) al iniciar la app', async () => {
    useAuthStore.setState({ token: 'vencido', user })
    vi.mocked(authApi.fetchMe).mockRejectedValue(httpError(401))

    await useAuthStore.getState().verifySession()

    expect(useAuthStore.getState().token).toBeNull()
  })

  it('no cierra la sesión por un error de red o del servidor', async () => {
    useAuthStore.setState({ token: 'vigente', user })
    vi.mocked(authApi.fetchMe).mockRejectedValue(httpError(503))

    await useAuthStore.getState().verifySession()

    expect(useAuthStore.getState().token).toBe('vigente')
  })

  it('actualiza el usuario con GET /auth/me', async () => {
    useAuthStore.setState({ token: 'vigente', user: null })
    vi.mocked(authApi.fetchMe).mockResolvedValue(user)

    await useAuthStore.getState().verifySession()

    expect(useAuthStore.getState().user?.full_name).toBe('Ana Pérez')
  })
})

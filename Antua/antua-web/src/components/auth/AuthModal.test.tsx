import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import * as authApi from '../../api/auth'
import { AuthModal } from './AuthModal'
import { useAuthModalStore } from '../../stores/authModalStore'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'

vi.mock('../../api/auth', () => ({ login: vi.fn(), register: vi.fn(), fetchMe: vi.fn() }))

const session = {
  token: 'jwt-1',
  user: { id: 7, full_name: 'Ana Pérez', email: 'ana@antua.test', phone: null, created_at: '2026-11-01T10:00:00Z' },
}

const unauthorized = new AxiosError('Unauthorized', '401', undefined, undefined, {
  status: 401,
  statusText: 'Unauthorized',
  data: { message: 'Credenciales incorrectas.' },
  headers: {},
  config: { headers: new AxiosHeaders() },
})

const openModal = (tab: 'login' | 'register' = 'login') => {
  render(<AuthModal />)
  act(() => useAuthModalStore.getState().open(tab))
}

describe('AuthModal', () => {
  beforeEach(() => {
    useAuthModalStore.setState({ isOpen: false, tab: 'login', returnFocusTo: null })
    useAuthStore.setState({ token: null, user: null })
    useCartStore.setState({ mergeGuestCart: vi.fn().mockResolvedValue({ ok: true }) })
  })

  it('es un diálogo modal con las dos tabs', () => {
    openModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('tab', { name: 'Iniciar sesión' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Registrarme' })).toHaveAttribute('aria-selected', 'false')
  })

  it('las flechas del teclado cambian de tab', async () => {
    openModal()
    screen.getByRole('tab', { name: 'Iniciar sesión' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Registrarme' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
  })

  it('valida en línea y enfoca el primer campo con error', async () => {
    openModal()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const email = screen.getByLabelText('Email')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveFocus()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('traduce el 401 del backend junto a la contraseña', async () => {
    vi.mocked(authApi.login).mockRejectedValue(unauthorized)
    openModal()
    await userEvent.type(screen.getByLabelText('Email'), 'ana@antua.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'equivocada')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText(/no coinciden/)).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('al iniciar sesión guarda la sesión, suma el carrito y cierra', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session)
    openModal()
    await userEvent.type(screen.getByLabelText('Email'), 'ana@antua.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'SeedPass123!')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => expect(useAuthModalStore.getState().isOpen).toBe(false))
    expect(authApi.login).toHaveBeenCalledWith('ana@antua.test', 'SeedPass123!')
    expect(useAuthStore.getState().token).toBe('jwt-1')
    expect(useCartStore.getState().mergeGuestCart).toHaveBeenCalledOnce()
  })
})

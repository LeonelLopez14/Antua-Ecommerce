import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import Profile from './Profile'
import { useAuthStore } from '../../stores/authStore'

vi.mock('../../api/auth', () => ({ updateProfile: vi.fn(), changePassword: vi.fn() }))

function renderProfile() {
  const router = createMemoryRouter(
    [
      { path: '/cuenta/perfil', element: <Profile /> },
      { path: '/tienda', element: <p>Tienda</p> },
    ],
    { initialEntries: ['/cuenta/perfil'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('Perfil: aviso de cambios sin guardar', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'jwt',
      user: { id: 1, full_name: 'Ana Pérez', email: 'ana@antojarte.example', phone: null, role: 'customer', created_at: '2026-11-01T10:00:00Z' },
    })
  })

  it('sin cambios, se sale sin preguntar', async () => {
    const router = renderProfile()
    await act(() => router.navigate('/tienda'))
    expect(screen.getByText('Tienda')).toBeInTheDocument()
  })

  it('con el nombre cambiado, pregunta antes de salir y deja seguir editando', async () => {
    const router = renderProfile()
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana María Pérez' } })
    await act(() => router.navigate('/tienda'))
    expect(screen.getByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.queryByText('Tienda')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana María Pérez')
  })

  it('con una contraseña escrita también pregunta', async () => {
    const router = renderProfile()
    const current = screen.getByLabelText('Contraseña actual')
    fireEvent.input(current, { target: { value: 'algo' } })
    await act(() => router.navigate('/tienda'))
    expect(screen.getByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeInTheDocument()
  })
})

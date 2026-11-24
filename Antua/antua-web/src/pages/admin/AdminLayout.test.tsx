import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuthModalStore } from '../../stores/authModalStore'
import { useAuthStore } from '../../stores/authStore'

const user = (role: 'customer' | 'admin') => ({
  id: 1,
  full_name: 'Ana Pérez',
  email: 'ana@antojarte.example',
  phone: null,
  role,
  created_at: '2026-11-01T10:00:00Z',
})

const renderAdmin = () =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/admin', element: <AdminLayout />, children: [{ index: true, element: <p>Contenido del panel</p> }] }],
        { initialEntries: ['/admin'] },
      )}
    />,
  )

describe('AdminLayout (guard de rol, solo comodidad: la seguridad está en el backend)', () => {
  beforeEach(() => {
    useAuthModalStore.setState({ isOpen: false, tab: 'login', returnFocusTo: null, open: vi.fn() })
  })

  it('sin sesión abre el AuthModal y no muestra el panel', () => {
    useAuthStore.setState({ token: null, user: null })
    renderAdmin()
    expect(screen.getByRole('heading', { name: 'Iniciá sesión para administrar' })).toBeInTheDocument()
    expect(useAuthModalStore.getState().open).toHaveBeenCalledWith('login')
    expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument()
  })

  it('con un cliente muestra "No tenés permiso"', () => {
    useAuthStore.setState({ token: 'jwt', user: user('customer') })
    renderAdmin()
    expect(screen.getByRole('heading', { name: 'No tenés permiso' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument()
  })

  it('con un admin muestra la navegación y el contenido, y no se indexa', () => {
    useAuthStore.setState({ token: 'jwt', user: user('admin') })
    renderAdmin()
    expect(screen.getByRole('navigation', { name: 'Secciones del panel' })).toBeInTheDocument()
    expect(screen.getByText('Contenido del panel')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toBeInTheDocument()
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  })
})

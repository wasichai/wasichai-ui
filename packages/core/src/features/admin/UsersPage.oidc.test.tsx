import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders } from '@wasichai/testing'
import type { AuthUser } from '../../types/auth'
import { UsersPage } from './UsersPage'
import type { AdminUser, Role } from './types'

// the test harness mounts local auth; only the mode is swapped
const auth = vi.hoisted(() => ({ mode: 'oidc' as 'local' | 'oidc' }))
vi.mock('../../auth/AuthProvider', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../auth/AuthProvider')>()
  return { ...original, useAuth: () => ({ ...original.useAuth(), mode: auth.mode }) }
})

const signedIn: AuthUser = { id: 'u-ana', email: 'ana@wasichai.test', displayName: 'Ana Admin', organizationId: 'org-1', roles: ['ADMIN'] }

const users: AdminUser[] = [
  { id: 'u-ana', email: 'ana@wasichai.test', displayName: 'Ana Admin', enabled: true, roles: ['ADMIN'], createdAt: null, linked: true },
  { id: 'u-beto', email: 'beto@wasichai.test', displayName: 'Beto Inspector', enabled: true, roles: [], createdAt: null, linked: false }
]
const roles: Role[] = [{ id: 'r-1', name: 'ADMIN', label: 'Administrador', ownRecordsOnly: false, permissions: [], fieldPermissions: [] }]

afterEach(() => {
  auth.mode = 'oidc'
  vi.restoreAllMocks()
})

describe('UsersPage in oidc', () => {
  it('invites without a password field and sends none', async () => {
    const fetch = mockFetch([
      { path: '/users', body: users },
      { path: '/roles', body: roles },
      { method: 'POST', path: '/users', status: 201, body: users[1] }
    ])
    try {
      renderWithProviders(<UsersPage />, { user: signedIn })
      await screen.findByText('Ana Admin')
      expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
      await userEvent.type(screen.getByLabelText('Correo'), 'Nuevo@Wasichai.test')
      await userEvent.click(screen.getByRole('button', { name: 'Crear' }))
      const post = fetch.calls.find((call) => call.method === 'POST')
      expect(post!.body).toEqual({ email: 'nuevo@wasichai.test', displayName: 'Nuevo@Wasichai.test', roles: [] })
    } finally {
      fetch.restore()
    }
  })

  it('shows linked and pending', async () => {
    const fetch = mockFetch([
      { path: '/users', body: users },
      { path: '/roles', body: roles }
    ])
    try {
      renderWithProviders(<UsersPage />, { user: signedIn })
      expect(await screen.findByText('Vinculado')).toBeInTheDocument()
      expect(screen.getByText('Pendiente')).toBeInTheDocument()
    } finally {
      fetch.restore()
    }
  })

  it('unlinks a linked user after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetch = mockFetch([
      { method: 'PUT', path: '/users/u-ana', body: { ...users[0], linked: false } },
      { path: '/users', body: users },
      { path: '/roles', body: roles }
    ])
    try {
      renderWithProviders(<UsersPage />, { user: signedIn })
      await userEvent.click(await screen.findByRole('button', { name: 'Editar ana@wasichai.test' }))
      expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }))
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('vinculará otra vez'))
      const put = fetch.calls.find((call) => call.method === 'PUT')
      expect(put!.body).toEqual({ unlink: true })
      expect(await screen.findByTestId('edit-link-state')).toHaveTextContent('Pendiente')
      expect(screen.queryByRole('button', { name: 'Desvincular' })).not.toBeInTheDocument()
    } finally {
      fetch.restore()
    }
  })

  it('offers no unlink for a pending user', async () => {
    const fetch = mockFetch([
      { path: '/users', body: users },
      { path: '/roles', body: roles }
    ])
    try {
      renderWithProviders(<UsersPage />, { user: signedIn })
      await userEvent.click(await screen.findByRole('button', { name: 'Editar beto@wasichai.test' }))
      expect(screen.queryByRole('button', { name: 'Desvincular' })).not.toBeInTheDocument()
    } finally {
      fetch.restore()
    }
  })
})

describe('UsersPage in local', () => {
  it('keeps the password field and shows no link state', async () => {
    auth.mode = 'local'
    const fetch = mockFetch([
      { path: '/users', body: users },
      { path: '/roles', body: roles }
    ])
    try {
      renderWithProviders(<UsersPage />, { user: signedIn })
      await screen.findByText('Ana Admin')
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
      expect(screen.queryByText('Vinculado')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Editar ana@wasichai.test' }))
      expect(screen.queryByRole('button', { name: 'Desvincular' })).not.toBeInTheDocument()
    } finally {
      fetch.restore()
    }
  })
})

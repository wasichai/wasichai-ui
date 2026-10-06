import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders } from '@wasichai/testing'
import type { AuthUser } from '../../types/auth'
import { UsersPage } from './UsersPage'
import type { AdminUser, Role } from './types'

const SIGNED_IN_ID = 'u-ana'

// the page reads the signed-in user to protect them from themselves
const signedIn: AuthUser = { id: SIGNED_IN_ID, email: 'ana@wasichai.test', displayName: 'Ana Admin', organizationId: 'org-1', roles: ['ADMIN'] }

const users: AdminUser[] = [
  {
    id: SIGNED_IN_ID,
    email: 'ana@wasichai.test',
    displayName: 'Ana Admin',
    enabled: true,
    roles: ['ADMIN'],
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'u-beto',
    email: 'beto@wasichai.test',
    displayName: 'Beto Inspector',
    enabled: false,
    roles: ['INSPECTOR'],
    createdAt: null
  }
]

const roles: Role[] = [
  {
    id: 'r-1',
    name: 'ADMIN',
    label: 'Administrador',
    ownRecordsOnly: false,
    permissions: [],
    fieldPermissions: []
  },
  {
    id: 'r-2',
    name: 'INSPECTOR',
    label: 'Inspector',
    ownRecordsOnly: true,
    permissions: [],
    fieldPermissions: []
  }
]

// no server in tests: answer /api/users and /api/roles straight from fetch
function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/roles') ? roles : users
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(body)
      } as Response
    })
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('UsersPage', () => {
  it('renders the users it fetched with their roles and state', async () => {
    stubApi()
    renderWithProviders(<UsersPage />, { user: signedIn })

    expect(await screen.findByText('Ana Admin')).toBeInTheDocument()
    expect(screen.getByText('beto@wasichai.test')).toBeInTheDocument()
    expect(screen.getByText('INSPECTOR')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('refuses to let the signed-in user delete themselves', async () => {
    stubApi()
    renderWithProviders(<UsersPage />, { user: signedIn })

    const self = await screen.findByRole('button', { name: 'Eliminar ana@wasichai.test' })
    const other = screen.getByRole('button', { name: 'Eliminar beto@wasichai.test' })

    expect(self).toBeDisabled()
    expect(self).toHaveAttribute('title', 'No puedes desactivarte ni eliminarte a ti mismo')
    expect(other).toBeEnabled()
  })

  it('says why a delete was refused', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetch = mockFetch([
      { path: '/users', body: users },
      { path: '/roles', body: roles },
      { method: 'DELETE', path: '/users/u-beto', status: 409, body: { title: 'Conflict', detail: 'El usuario firmó registros de solo anexado' } }
    ])
    try {
      renderWithProviders(<UsersPage />, { user: signedIn })
      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar beto@wasichai.test' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('El usuario firmó registros de solo anexado')
    } finally {
      fetch.restore()
    }
  })
})

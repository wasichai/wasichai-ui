import { screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { AuditPage } from './AuditPage'
import { PermissionsPage } from './PermissionsPage'
import { RolesPage } from './RolesPage'
import { ServiceAccountsPage } from './ServiceAccountsPage'
import { UsersPage } from './UsersPage'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

const FORBIDDEN = { status: 403, body: { title: 'Forbidden', detail: 'Access denied' } }

// a student who types /admin/users by hand: the api says 403, the screen must not say "no users yet" (#139)
describe.each<[string, ComponentType, string, string]>([
  ['UsersPage', UsersPage, '/users', 'Usuarios'],
  ['RolesPage', RolesPage, '/roles', 'Roles'],
  ['ServiceAccountsPage', ServiceAccountsPage, '/service-accounts', 'Cuentas de servicio'],
  ['PermissionsPage', PermissionsPage, '/roles', 'Permisos'],
  ['AuditPage', AuditPage, '/audit', 'Auditoría']
])('%s on a 403', (_, Page, path, title) => {
  it('says the caller may not see it, with no empty list and no form', async () => {
    fetch = mockFetch([
      { path, ...FORBIDDEN },
      { path: '/roles', body: [] },
      { path: '/metadata/objects', body: [] }
    ])
    renderWithProviders(<Page />)

    expect(await screen.findByText('No tienes permiso para ver esto')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'error')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('admin screens on a 403, in english', () => {
  it('says so in the user language', async () => {
    fetch = mockFetch([
      { path: '/users', ...FORBIDDEN },
      { path: '/roles', body: [] }
    ])
    renderWithProviders(<UsersPage />, { language: 'en' })
    expect(await screen.findByText('You are not allowed to see this')).toBeInTheDocument()
  })
})

describe('admin screens on another failure', () => {
  it('says the list failed and offers a retry, not an empty list', async () => {
    fetch = mockFetch([
      { path: '/users', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } },
      { path: '/roles', body: [] }
    ])
    renderWithProviders(<UsersPage />)
    expect(await screen.findByText('boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Todavía no hay usuarios')).not.toBeInTheDocument()
  })
})

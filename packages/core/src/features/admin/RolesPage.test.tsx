import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { RolesPage } from './RolesPage'
import type { Role } from './types'

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

const roles: Role[] = [
  { id: 'r-1', name: 'ADMIN', label: 'Administrador', ownRecordsOnly: false, permissions: [], fieldPermissions: [] },
  { id: 'r-2', name: 'INSPECTOR', label: 'Inspector', ownRecordsOnly: true, permissions: [], fieldPermissions: [] }
]

describe('RolesPage', () => {
  it('says why a delete was refused', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fetch = mockFetch([
      { path: '/roles', body: roles },
      { method: 'DELETE', path: '/roles/INSPECTOR', status: 409, body: { title: 'Conflict', detail: 'El rol tiene usuarios' } }
    ])
    renderWithProviders(<RolesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar INSPECTOR' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El rol tiene usuarios')
  })

  it('refuses the protected role before asking the server, in the same place', async () => {
    const ask = vi.spyOn(window, 'confirm')
    fetch = mockFetch([{ path: '/roles', body: roles }])
    renderWithProviders(<RolesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar ADMIN' }))

    expect(screen.getByRole('alert')).toHaveTextContent('ADMIN')
    expect(ask).not.toHaveBeenCalled()
  })
})

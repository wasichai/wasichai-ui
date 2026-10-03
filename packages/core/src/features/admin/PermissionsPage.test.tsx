import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import type { ObjectSummary } from '../../types/metadata'
import { PermissionsPage } from './PermissionsPage'
import type { DeclaredAction, Permission, Role } from './types'

vi.mock('@wasichai/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/ui')>()),
  ...(await import('../../test/nativeSelect'))
}))

const objects: ObjectSummary[] = [
  { id: 'o-1', name: 'recibo', label: 'Recibo', pluralLabel: 'Recibos', description: null, enabled: true },
  { id: 'o-2', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true }
]

const declared: Record<string, DeclaredAction[]> = {
  recibo: [
    { name: 'ANULAR_AJENO', label: 'Anular recibo ajeno' },
    { name: 'REIMPRIMIR', label: 'Reimprimir' }
  ],
  predio: []
}

function cajero(permissions: Permission[]): Role {
  return { id: 'r-1', name: 'CAJERO', label: 'Cajero', ownRecordsOnly: false, permissions, fieldPermissions: [] }
}

// no server in tests: answer by path, remember what the PUT sent
function stubApi(role: Role) {
  const sent: Permission[][] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      let body: unknown = []
      if (url.includes('/permissions') && init?.method === 'PUT') {
        sent.push((JSON.parse(String(init.body)) as { permissions: Permission[] }).permissions)
        body = role
      } else if (url.includes('/api/roles')) body = [role]
      else {
        const actions = url.match(/\/api\/metadata\/objects\/([^/]+)\/actions$/)
        body = actions ? declared[actions[1]] : objects
      }
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) } as Response
    })
  )
  return sent
}

async function pickRole() {
  await screen.findByRole('option', { name: 'Cajero' })
  await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'CAJERO')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PermissionsPage', () => {
  it('sends a declared grant back untouched when the built-in matrix is saved', async () => {
    const sent = stubApi(
      cajero([
        { objectName: 'recibo', action: 'READ', allowed: true },
        { objectName: 'recibo', action: 'ANULAR_AJENO', allowed: true },
        // declared on no listed object: not rendered, still kept
        { objectName: 'recibo', action: 'VIEJO', allowed: true }
      ])
    )
    renderWithProviders(<PermissionsPage />)
    await pickRole()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'predio READ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar permisos' }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual([
      { objectName: 'predio', action: 'READ', allowed: true },
      { objectName: 'recibo', action: 'READ', allowed: true },
      { objectName: 'recibo', action: 'ANULAR_AJENO', allowed: true },
      { objectName: 'recibo', action: 'VIEJO', allowed: true }
    ])
  })

  it('lists an object declared actions by label and grants and revokes them', async () => {
    const sent = stubApi(cajero([{ objectName: 'recibo', action: 'ANULAR_AJENO', allowed: true }]))
    renderWithProviders(<PermissionsPage />)
    await pickRole()

    const anular = await screen.findByRole('checkbox', { name: 'recibo ANULAR_AJENO' })
    const reimprimir = screen.getByRole('checkbox', { name: 'recibo REIMPRIMIR' })
    expect(screen.getByText('Anular recibo ajeno')).toBeInTheDocument()
    expect(anular).toBeChecked()
    expect(reimprimir).not.toBeChecked()
    // tenant-wide row offers none: a declared action is the object's own verb
    expect(screen.queryByRole('checkbox', { name: '* ANULAR_AJENO' })).not.toBeInTheDocument()

    await userEvent.click(anular)
    await userEvent.click(reimprimir)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar permisos' }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual([{ objectName: 'recibo', action: 'REIMPRIMIR', allowed: true }])
  })
})

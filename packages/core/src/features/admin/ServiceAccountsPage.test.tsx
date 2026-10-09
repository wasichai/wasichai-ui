import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { ServiceAccountsPage } from './ServiceAccountsPage'
import type { Role, ServiceAccount } from './types'

const accounts: ServiceAccount[] = [
  {
    id: 'sa1',
    clientId: 'sa1',
    name: 'rentas',
    enabled: true,
    roles: ['SISTEMA_ORIGEN'],
    createdAt: '2026-10-02T09:00:00Z',
    secretRotatedAt: '2026-10-02T09:00:00Z'
  },
  { id: 'sa2', clientId: 'sa2', name: 'catastro-sync', enabled: false, roles: [], createdAt: null, secretRotatedAt: null }
]

const role = (name: string, label: string): Role => ({ id: `r-${name}`, name, label, ownRecordsOnly: false, permissions: [], fieldPermissions: [] })
const roles: Role[] = [role('ADMIN', 'Administrador'), role('INSPECTOR', 'Inspector'), role('SISTEMA_ORIGEN', 'Sistema de origen')]

const SECRET = 's3cr3t-only-once'
const ROTATED = 'n3w-s3cr3t'

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  fetch = null
  vi.restoreAllMocks()
})

function serve(extra: MockRoute[] = []) {
  fetch = mockFetch([{ path: '/service-accounts', body: accounts }, { path: '/roles', body: roles }, ...extra])
  return fetch
}

// a secret must not outlive its one display in any react-query cache
function cachedSecret(queryClient: ReturnType<typeof renderWithProviders>['queryClient'], secret: string) {
  const queries = queryClient
    .getQueryCache()
    .getAll()
    .map((query) => query.state.data)
  const mutations = queryClient
    .getMutationCache()
    .getAll()
    .map((mutation) => mutation.state.data)
  return JSON.stringify([queries, mutations]).includes(secret)
}

describe('ServiceAccountsPage', () => {
  it('lists the accounts without any secret', async () => {
    serve()
    renderWithProviders(<ServiceAccountsPage />)

    expect(await screen.findByText('rentas')).toBeInTheDocument()
    expect(screen.getByText('catastro-sync')).toBeInTheDocument()
    expect(screen.getByText('sa1')).toBeInTheDocument()
    expect(screen.getByText('SISTEMA_ORIGEN')).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
    expect(screen.queryByText('Copia el secreto ahora: no se volverá a mostrar.')).not.toBeInTheDocument()
  })

  it('creates an account and shows its secret once', async () => {
    const calls = serve([
      {
        method: 'POST',
        path: '/service-accounts',
        status: 201,
        body: { ...accounts[0], id: 'sa3', clientId: 'sa3', roles: ['INSPECTOR'], clientSecret: SECRET }
      }
    ])
    const { queryClient } = renderWithProviders(<ServiceAccountsPage />)
    await screen.findByText('rentas')

    await userEvent.type(screen.getByLabelText('Nombre'), 'rentas')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Inspector' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument()
    expect(screen.getByDisplayValue('sa3')).toBeInTheDocument()
    expect(screen.getByText('Copia el secreto ahora: no se volverá a mostrar.')).toBeInTheDocument()
    expect(calls.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'rentas', roles: ['INSPECTOR'] })
    // the list was asked again, and the secret sits in no cache meanwhile
    await waitFor(() => expect(calls.calls.filter((call) => call.method === 'GET' && call.path === '/service-accounts')).toHaveLength(2))
    await waitFor(() => expect(cachedSecret(queryClient, SECRET)).toBe(false))

    await userEvent.click(screen.getByRole('button', { name: 'Ya lo guardé' }))
    expect(screen.queryByDisplayValue(SECRET)).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(SECRET)
  })

  it('copies the secret to the clipboard', async () => {
    serve([{ method: 'POST', path: '/service-accounts', status: 201, body: { ...accounts[0], clientSecret: SECRET } }])
    const user = userEvent.setup()
    renderWithProviders(<ServiceAccountsPage />)
    await screen.findByText('catastro-sync')

    await user.type(screen.getByLabelText('Nombre'), 'rentas')
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    await user.click(await screen.findByRole('button', { name: 'Copiar' }))

    expect(await navigator.clipboard.readText()).toBe(SECRET)
  })

  it('refuses a name the server would refuse', async () => {
    const calls = serve()
    renderWithProviders(<ServiceAccountsPage />)
    await screen.findByText('rentas')

    const name = screen.getByLabelText('Nombre')
    await userEvent.type(name, 'Rentas 1')

    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('minúsculas, números, _ o -, empieza con letra; no se cambia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear' })).toBeDisabled()
    expect(calls.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('does not offer ADMIN as a role', async () => {
    serve()
    renderWithProviders(<ServiceAccountsPage />)
    expect(await screen.findByRole('checkbox', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Administrador' })).not.toBeInTheDocument()
  })

  it('says why a create was refused', async () => {
    serve([{ method: 'POST', path: '/service-accounts', status: 409, body: { title: 'Conflict', detail: 'Service account rentas already exists' } }])
    renderWithProviders(<ServiceAccountsPage />)
    await screen.findByText('catastro-sync')

    await userEvent.type(screen.getByLabelText('Nombre'), 'rentas')
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Service account rentas already exists')
  })

  it('rotates the secret after confirming and shows the new one', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const calls = serve([{ method: 'POST', path: '/service-accounts/sa1/secret', body: { ...accounts[0], clientSecret: ROTATED } }])
    const { queryClient } = renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secreto rentas' }))

    expect(confirm).toHaveBeenCalledWith('El secreto actual dejará de servir para pedir tokens. ¿Rotar?')
    expect(await screen.findByDisplayValue(ROTATED)).toBeInTheDocument()
    expect(calls.calls.some((call) => call.method === 'POST' && call.path === '/service-accounts/sa1/secret')).toBe(true)
    await waitFor(() => expect(cachedSecret(queryClient, ROTATED)).toBe(false))
  })

  it('does not rotate when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const calls = serve()
    renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secreto rentas' }))

    expect(calls.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('disables an account after confirming', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const calls = serve([{ method: 'PUT', path: '/service-accounts/sa1', body: { ...accounts[0], enabled: false } }])
    renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar rentas' }))

    expect(confirm).toHaveBeenCalledWith('¿Desactivar la cuenta rentas? Dejará de obtener tokens.')
    await waitFor(() => expect(calls.calls.find((call) => call.method === 'PUT')?.body).toEqual({ enabled: false }))
    expect(calls.calls.find((call) => call.method === 'PUT')?.path).toBe('/service-accounts/sa1')
  })

  it('enables an account without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const calls = serve([{ method: 'PUT', path: '/service-accounts/sa2', body: { ...accounts[1], enabled: true } }])
    renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Activar catastro-sync' }))

    await waitFor(() => expect(calls.calls.find((call) => call.method === 'PUT')?.body).toEqual({ enabled: true }))
    expect(confirm).not.toHaveBeenCalled()
  })

  it('replaces the roles of an account', async () => {
    const calls = serve([{ method: 'PUT', path: '/service-accounts/sa1', body: accounts[0] }])
    renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Editar rentas' }))
    const editor = screen.getByRole('form', { name: 'Editando rentas' })
    await userEvent.click(within(editor).getByRole('checkbox', { name: 'Inspector' }))
    await userEvent.click(within(editor).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(calls.calls.find((call) => call.method === 'PUT')?.body).toEqual({ roles: ['SISTEMA_ORIGEN', 'INSPECTOR'] }))
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Editando rentas' })).not.toBeInTheDocument())
  })

  it('deletes an account after confirming', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const calls = serve([{ method: 'DELETE', path: '/service-accounts/sa1', status: 204 }])
    renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar rentas' }))

    expect(confirm).toHaveBeenCalledWith('¿Eliminar la cuenta rentas? Sus entradas del historial perderán el nombre; desactivarla lo conserva.')
    await waitFor(() => expect(calls.calls.some((call) => call.method === 'DELETE' && call.path === '/service-accounts/sa1')).toBe(true))
  })

  it('says why a row action was refused', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    serve([{ method: 'DELETE', path: '/service-accounts/sa1', status: 403, body: { title: 'Forbidden', detail: 'Access denied' } }])
    renderWithProviders(<ServiceAccountsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar rentas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied')
  })

  it('says when the caller may not manage service accounts', async () => {
    fetch = mockFetch([
      { path: '/service-accounts', status: 403, body: { title: 'Forbidden', detail: 'Access denied' } },
      { path: '/roles', body: roles }
    ])
    renderWithProviders(<ServiceAccountsPage />)

    expect(await screen.findByText('No tienes permiso para ver esto')).toBeInTheDocument()
  })
})

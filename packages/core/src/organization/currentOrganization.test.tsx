import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { useAuth } from '../auth/AuthProvider'
import { LoginPage } from '../auth/LoginPage'
import { AppShell } from '../shell/AppShell'
import type { WasichaiConfig } from '../app/config'
import { useCurrentOrganization, type CurrentOrganization } from './currentOrganization'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())
beforeEach(() => {
  document.title = 'index.html'
})

const ica: CurrentOrganization = { id: 'org-test', name: 'Municipalidad Provincial de Ica', slug: 'ica', createdAt: null }
const ana = { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'org-test', roles: ['ADMIN'] }
const orgRoute = { path: '/organizations/current', body: ica }
const loginRoute = { method: 'POST', path: '/auth/login', body: { token: 't', expiresAt: '2099-01-01T00:00:00Z', user: ana } }
const nombre = (org: CurrentOrganization | null) => (org ? `Catastro ${org.name.replace('Municipalidad Provincial de ', '')}` : 'Catastro')
const lema = (org: CurrentOrganization | null) => (org ? org.slug : 'sin sesión')

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
const orgCalls = () => fetch?.calls.filter((call) => call.path === '/organizations/current') ?? []

function Probe() {
  const org = useCurrentOrganization()
  const { signOut } = useAuth()
  return (
    <>
      <p data-testid="org">{org?.name ?? 'none'}</p>
      <button type="button" onClick={signOut}>
        salir
      </button>
    </>
  )
}

describe('useCurrentOrganization', () => {
  it('reads the organization once signed in', async () => {
    fetch = mockFetch([orgRoute])
    renderWithProviders(<Probe />)
    expect(screen.getByTestId('org')).toHaveTextContent('none')
    expect(await screen.findByText('Municipalidad Provincial de Ica')).toBeInTheDocument()
  })

  it('makes no request when signed out', async () => {
    fetch = mockFetch([orgRoute])
    renderWithProviders(<Probe />, { user: null, permissions: null })
    await settle()
    expect(screen.getByTestId('org')).toHaveTextContent('none')
    expect(orgCalls()).toEqual([])
  })

  it('falls back to null when the request fails', async () => {
    fetch = mockFetch([{ path: '/organizations/current', status: 500, body: { title: 'Boom' } }])
    renderWithProviders(<Probe />)
    await waitFor(() => expect(orgCalls()).toHaveLength(1))
    await settle()
    expect(screen.getByTestId('org')).toHaveTextContent('none')
  })

  it('turns null again on sign out', async () => {
    fetch = mockFetch([orgRoute])
    renderWithProviders(<Probe />)
    expect(await screen.findByText('Municipalidad Provincial de Ica')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'salir' }))
    expect(screen.getByTestId('org')).toHaveTextContent('none')
  })
})

describe('appName and appTagline as functions of the organization', () => {
  it('keeps a plain string as it was: no request, document.title untouched', async () => {
    fetch = mockFetch([orgRoute])
    renderWithProviders(<AppShell />, { config: { appName: 'Catastro', appTagline: 'Gestión' } })
    await settle()
    expect(screen.getByText('Catastro')).toBeInTheDocument()
    expect(screen.getByText('Gestión')).toBeInTheDocument()
    expect(orgCalls()).toEqual([])
    expect(document.title).toBe('index.html')
  })

  it('shows appName(null) on the login page, without asking the server', async () => {
    fetch = mockFetch([orgRoute])
    renderWithProviders(<LoginPage />, { user: null, permissions: null, config: { appName: nombre, appTagline: lema } })
    await settle()
    expect(screen.getByText('Catastro')).toBeInTheDocument()
    expect(screen.getByText('sin sesión')).toBeInTheDocument()
    expect(orgCalls()).toEqual([])
    expect(document.title).toBe('Catastro')
  })

  it('shows the organization after login and appName(null) again after logout', async () => {
    fetch = mockFetch([loginRoute, orgRoute])
    const config: Partial<WasichaiConfig> = { appName: nombre, appTagline: lema }
    renderWithProviders(
      <>
        <LoginPage />
        <AppShell />
      </>,
      { user: null, permissions: null, config }
    )
    expect(document.title).toBe('Catastro')

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@wasichai.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Catastro Ica')).toBeInTheDocument()
    expect(screen.getByText('ica')).toBeInTheDocument()
    expect(document.title).toBe('Catastro Ica')

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(document.title).toBe('Catastro'))
    expect(screen.queryByText('Catastro Ica')).not.toBeInTheDocument()
  })

  it('uses appName(null) when the organization cannot be read', async () => {
    fetch = mockFetch([{ path: '/organizations/current', status: 500, body: { title: 'Boom' } }])
    renderWithProviders(<AppShell />, { config: { appName: nombre } })
    await waitFor(() => expect(orgCalls()).toHaveLength(1))
    await settle()
    expect(screen.getByText('Catastro')).toBeInTheDocument()
    expect(document.title).toBe('Catastro')
  })

  it('leaves document.title alone with syncDocumentTitle: false', async () => {
    fetch = mockFetch([orgRoute])
    renderWithProviders(<AppShell />, { config: { appName: nombre, syncDocumentTitle: false } })
    expect(await screen.findByText('Catastro Ica')).toBeInTheDocument()
    expect(document.title).toBe('index.html')
  })
})

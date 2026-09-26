import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { WasichaiModule } from '../registry/contract'
import { WasichaiRoutes } from './WasichaiRoutes'
import { coreModule } from './coreModule'

const Sheet = () => <p>hoja suelta</p>
const Plans = () => <p>planos cargados</p>
const plans: WasichaiModule = {
  id: 'plans',
  basePath: 'plans',
  routes: [
    { id: 'sheet', path: 'sheet/:id', component: Sheet, chrome: 'bare' },
    { id: 'list', path: '', lazy: async () => ({ default: Plans }) }
  ]
}

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

function mount(route: string, signedIn = true) {
  fetch = mockFetch([
    { path: '/objects', body: [] },
    {
      method: 'POST',
      path: '/auth/login',
      body: {
        token: 't',
        expiresAt: '2026-12-31T00:00:00Z',
        user: { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'o1', roles: [] }
      }
    },
    { path: '/auth/me/permissions', body: { admin: true, objects: {} } }
  ])
  return renderWithProviders(<WasichaiRoutes />, {
    modules: [coreModule, plans],
    route,
    user: signedIn ? undefined : null,
    permissions: signedIn ? undefined : null
  })
}

describe('WasichaiRoutes', () => {
  it('opens the dashboard at the root, inside the shell', async () => {
    mount('/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByText('Datos')).toBeInTheDocument()
  })

  it('sends a signed-out visitor of any shell route to the login page', async () => {
    mount('/plans', false)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('sends an unknown path home', async () => {
    mount('/nowhere/at/all')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('draws a bare route without the shell', async () => {
    mount('/plans/sheet/7')
    expect(await screen.findByText('hoja suelta')).toBeInTheDocument()
    expect(screen.queryByText('Datos')).not.toBeInTheDocument()
  })

  it('loads a lazy route inside the shell', async () => {
    mount('/plans')
    expect(await screen.findByText('planos cargados')).toBeInTheDocument()
    expect(screen.getByText('Datos')).toBeInTheDocument()
  })

  it('lands on the dashboard after signing in', async () => {
    mount('/login', false)
    await userEvent.type(await screen.findByLabelText('Contraseña'), 'secret')
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@wasichai.test')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(fetch?.calls.find((call) => call.path === '/auth/login')?.body).toEqual({ email: 'ana@wasichai.test', password: 'secret' })
  })
})

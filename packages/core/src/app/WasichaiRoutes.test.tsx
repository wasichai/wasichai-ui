import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { WasichaiModule } from '../registry/contract'
import { WasichaiRoutes } from './WasichaiRoutes'
import { coreModule } from './coreModule'

const Sheet = () => <p>hoja suelta</p>
const Plans = () => <p>planos cargados</p>
const Broken = (): never => {
  throw new Error('plano corrupto')
}
const plans: WasichaiModule = {
  id: 'plans',
  basePath: 'plans',
  routes: [
    { id: 'sheet', path: 'sheet/:id', component: Sheet, chrome: 'bare' },
    { id: 'list', path: '', lazy: async () => ({ default: Plans }) },
    // after a deploy an open tab asks for a chunk that no longer exists
    { id: 'gone', path: 'gone', lazy: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/Gone.js')) },
    { id: 'broken', path: 'broken', component: Broken },
    { id: 'print', path: 'print', component: Broken, chrome: 'bare' }
  ]
}

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

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

  // with no boundary a throw anywhere unmounted the whole root: a white page, sidebar and all
  describe('a page that fails', () => {
    // react reports what a boundary caught; the tests only care about what is drawn
    const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})

    it('keeps the shell and says the page could not load when its chunk is gone', async () => {
      quiet()
      mount('/plans/gone')
      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar')
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
      expect(screen.getByText('Datos')).toBeInTheDocument()
    })

    it('keeps the shell when a page throws while drawing, and lets the next page draw', async () => {
      quiet()
      mount('/plans/broken')
      expect(await screen.findByRole('alert')).toHaveTextContent('plano corrupto')

      await userEvent.click(screen.getByRole('link', { name: 'Inicio' }))
      expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('says so outside the shell too', async () => {
      quiet()
      mount('/plans/print')
      expect(await screen.findByRole('alert')).toHaveTextContent('plano corrupto')
    })
  })
})

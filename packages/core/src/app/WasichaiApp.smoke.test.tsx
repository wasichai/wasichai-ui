import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { CORE_ROUTE_PATHS } from '../links/links'
import { joinPath } from '../links/paths'
import { RegistryError } from '../registry/createRegistry'
import type { WasichaiModule } from '../registry/contract'
import { WasichaiApp } from './WasichaiApp'
import { coreModule } from './coreModule'

const Sheets = () => <p>hojas del plano</p>
const plans: WasichaiModule = {
  id: 'plans',
  basePath: 'plans',
  routes: [{ id: 'sheets', path: 'sheets', lazy: async () => ({ default: Sheets }) }],
  navGroups: [{ id: 'plans', labelKey: 'plans:nav.group', order: 20 }],
  nav: [{ group: 'plans', labelKey: 'plans:nav.sheets', order: 10, route: 'sheets' }],
  i18n: { es: { nav: { group: 'Planos', sheets: 'Hojas' } }, en: { nav: { group: 'Plans', sheets: 'Sheets' } } }
}

const ana = { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'o1', roles: ['ADMIN'] }

let fetch: FetchMock | null = null
beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})
afterEach(() => fetch?.restore())

describe('WasichaiApp', () => {
  it('sends a signed-out deep link to login, signs in, and reaches a module page from the sidebar', async () => {
    fetch = mockFetch(
      [
        { method: 'POST', path: '/auth/login', body: { token: 't', expiresAt: '2026-12-31T00:00:00Z', user: ana } },
        { path: '/auth/me/permissions', body: { admin: true, objects: {} } },
        { path: '/objects', body: [] }
      ],
      { baseUrl: '/backend/api' }
    )
    window.history.pushState({}, '', '/plans/sheets')
    render(<WasichaiApp config={{ apiBaseUrl: '/backend/api', storagePrefix: 'smoke', appName: 'Catastro' }} modules={[plans]} />)

    await userEvent.type(await screen.findByLabelText('Correo'), 'ana@wasichai.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByText('Catastro')).toBeInTheDocument()
    expect(screen.getByText('Planos')).toBeInTheDocument()
    expect(localStorage.getItem('smoke.token')).toBe('t')
    expect(fetch.calls.map((call) => call.url)).toContain('/backend/api/auth/login')

    await userEvent.click(screen.getByRole('link', { name: 'Hojas' }))
    expect(await screen.findByText('hojas del plano')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/plans/sheets')
  })

  it('comes back signed in from its storage prefix and opens the deep link directly', async () => {
    localStorage.setItem('smoke.user', JSON.stringify(ana))
    localStorage.setItem('smoke.token', 't')
    fetch = mockFetch([{ path: '/auth/me/permissions', body: { admin: true, objects: {} } }])
    window.history.pushState({}, '', '/plans/sheets')
    render(<WasichaiApp config={{ storagePrefix: 'smoke' }} modules={[plans]} />)
    expect(await screen.findByText('hojas del plano')).toBeInTheDocument()
  })

  it('signs a session out and back to login when any api call answers 401', async () => {
    localStorage.setItem('smoke.user', JSON.stringify(ana))
    localStorage.setItem('smoke.token', 't')
    fetch = mockFetch([{ path: '/auth/me/permissions', status: 401, body: { title: 'Unauthorized' } }])
    window.history.pushState({}, '', '/plans/sheets')
    render(<WasichaiApp config={{ storagePrefix: 'smoke' }} modules={[plans]} />)

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(localStorage.getItem('smoke.token')).toBeNull()
    expect(localStorage.getItem('smoke.user')).toBeNull()
  })

  it('refuses to start when two modules claim the same field type', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const input = () => null
    const modules: WasichaiModule[] = [
      { id: 'a', fieldRenderers: { SKETCH: { section: 'a', input } } },
      { id: 'b', fieldRenderers: { SKETCH: { section: 'b', input } } }
    ]
    expect(() => render(<WasichaiApp modules={modules} />)).toThrow(/claimed by both 'a' and 'b'/)
  })

  it('refuses to start when two modules share an id', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const modules: WasichaiModule[] = [{ id: 'plans' }, { id: 'plans' }]
    expect(() => render(<WasichaiApp modules={modules} />)).toThrow(RegistryError)
    expect(() => render(<WasichaiApp modules={modules} />)).toThrow(/'plans' is registered twice/)
  })

  it('mounts every core screen at the path CORE_ROUTE_PATHS names', () => {
    const mounted = Object.fromEntries((coreModule.routes ?? []).map((route) => [route.id, joinPath(route.path)]))
    const table = Object.fromEntries(Object.entries(CORE_ROUTE_PATHS).map(([id, path]) => [id, joinPath(path)]))
    expect(mounted).toEqual(table)
  })
})

import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '@wasichai/testing'
import { createApiClient } from '../api/client'
import { createWasichaiI18n } from '../i18n/createI18n'
import type { WasichaiModule } from '../registry/contract'
import { createRegistry } from '../registry/createRegistry'
import type { AuthUser, CallerPermissions } from '../types/auth'
import { WasichaiProviders } from './WasichaiProviders'
import { WasichaiRoutes } from './WasichaiRoutes'
import { resolveConfig, type WasichaiConfig } from './config'
import { useWasichaiLinks } from './context'
import { coreModule } from './coreModule'

const ANA: AuthUser = { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'o1', roles: [] }
const STUDENT: CallerPermissions = { admin: false, objects: { curso: ['READ'] } }
const ADMIN: CallerPermissions = { admin: true, objects: {} }

const learning: WasichaiModule = {
  id: 'learning',
  basePath: 'learning',
  routes: [
    { id: 'mine', path: 'mine', component: () => <p>mis cursos</p> },
    { id: 'course', path: 'course/:id', component: () => <p>curso abierto</p> }
  ]
}

const Url = () => {
  const location = useLocation()
  return <output aria-label="url">{location.pathname + location.search + location.hash}</output>
}
const Home = () => <output aria-label="home">{useWasichaiLinks().home()}</output>

// how the permissions request answers: a body, a status, or never (still loading)
type PermissionsAnswer = CallerPermissions | { status: number } | 'pending'

let calls: string[] = []
const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
  localStorage.clear()
  vi.restoreAllMocks()
})

function stubFetch(permissions: PermissionsAnswer) {
  calls = []
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const path = String(input)
      .replace(/^\/api/, '')
      .split('?')[0]
    calls.push(path)
    if (path === '/auth/me/permissions') {
      if (permissions === 'pending') return new Promise<Response>(() => {})
      if ('status' in permissions) return jsonResponse({ title: 'Boom' }, permissions.status)
      return jsonResponse(permissions)
    }
    if (path === '/auth/login' && init.method === 'POST') return jsonResponse({ token: 't', expiresAt: '2026-12-31T00:00:00Z', user: ANA })
    if (path === '/objects') return jsonResponse([])
    return jsonResponse({ title: 'Not Found' }, 404)
  }) as typeof fetch
}

// the real providers with permissions fetched, as WasichaiApp has them
function mount(route: string, options: { config?: Partial<WasichaiConfig>; permissions?: PermissionsAnswer; signedIn?: boolean } = {}) {
  stubFetch(options.permissions ?? STUDENT)
  const config = resolveConfig({ storagePrefix: 'wasichai-home', languages: ['es'], ...options.config })
  const registry = createRegistry([coreModule, learning])
  const apiClient = createApiClient({ baseUrl: config.apiBaseUrl, storagePrefix: config.storagePrefix })
  const i18n = createWasichaiI18n({ languages: config.languages, storageKey: apiClient.keys.lang, modules: registry.modules })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <WasichaiProviders
      config={config}
      registry={registry}
      apiClient={apiClient}
      i18n={i18n}
      queryClient={queryClient}
      initialUser={options.signedIn === false ? null : ANA}
    >
      <MemoryRouter initialEntries={[route]}>
        <WasichaiRoutes />
        <Url />
        <Home />
      </MemoryRouter>
    </WasichaiProviders>
  )
}

const studentsToTheirCourses = (permissions: CallerPermissions) => (permissions.admin ? null : 'learning:mine')

async function signIn() {
  await userEvent.type(await screen.findByLabelText('Contraseña'), 'secret')
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@wasichai.test')
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('home route', () => {
  it('without homeRoute, / is the dashboard and Inicio points there', async () => {
    mount('/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('home')).toHaveTextContent(/^\/$/)
  })

  it('sends / to the chosen route without mounting the dashboard or asking for its data', async () => {
    mount('/', { config: { homeRoute: studentsToTheirCourses } })
    expect(await screen.findByText('mis cursos')).toBeInTheDocument()
    expect(screen.getByLabelText('url')).toHaveTextContent(/^\/learning\/mine$/)
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument()
    expect(calls).not.toContain('/objects')
  })

  it('points Inicio and links.home() at the same place', async () => {
    mount('/learning/course/3', { config: { homeRoute: studentsToTheirCourses } })
    expect(await screen.findByText('curso abierto')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/learning/mine')
    expect(screen.getByLabelText('home')).toHaveTextContent(/^\/learning\/mine$/)
  })

  it('gets the server permissions and keeps the dashboard when it returns null', async () => {
    const homeRoute = vi.fn(studentsToTheirCourses)
    mount('/', { config: { homeRoute }, permissions: ADMIN })
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(homeRoute).toHaveBeenCalledWith(ADMIN, { permissionsFailed: false })
    expect(screen.getByLabelText('url')).toHaveTextContent(/^\/$/)
  })

  it('shows loading, not the dashboard, while the permissions load', async () => {
    mount('/', { config: { homeRoute: studentsToTheirCourses }, permissions: 'pending' })
    expect(await screen.findAllByText('Cargando…')).not.toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument()
    expect(calls).not.toContain('/objects')
    expect(screen.getByLabelText('home')).toHaveTextContent(/^\/$/)
  })

  it('lets the app pick when the permissions fail, from none (#136)', async () => {
    const homeRoute = vi.fn(studentsToTheirCourses)
    mount('/', { config: { homeRoute }, permissions: { status: 500 } })
    expect(await screen.findByText('mis cursos')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument()
    expect(homeRoute).toHaveBeenLastCalledWith({ admin: false, objects: {}, capabilities: [] }, { permissionsFailed: true })
    expect(calls).not.toContain('/objects')
  })

  it('keeps the dashboard when the permissions fail and the app says so (#136)', async () => {
    mount('/', { config: { homeRoute: (_, { permissionsFailed }) => (permissionsFailed ? null : 'learning:mine') }, permissions: { status: 500 } })
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('tells the app the permissions are the caller own when they load (#136)', async () => {
    const homeRoute = vi.fn(studentsToTheirCourses)
    mount('/', { config: { homeRoute }, permissions: STUDENT })
    expect(await screen.findByText('mis cursos')).toBeInTheDocument()
    expect(homeRoute).toHaveBeenLastCalledWith(STUDENT, { permissionsFailed: false })
  })

  it('says which key is wrong when the chosen route is not registered', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mount('/', { config: { homeRoute: () => 'learning:nope' } })
    expect(await screen.findByText(/learning:nope/)).toBeInTheDocument()
  })

  it('sends an unknown path to the chosen route too', async () => {
    mount('/nowhere', { config: { homeRoute: studentsToTheirCourses } })
    expect(await screen.findByText('mis cursos')).toBeInTheDocument()
  })

  it('lands on the chosen route after signing in', async () => {
    mount('/login', { config: { homeRoute: studentsToTheirCourses }, signedIn: false })
    await signIn()
    expect(await screen.findByText('mis cursos')).toBeInTheDocument()
    expect(calls).not.toContain('/objects')
  })

  it('still goes back to the page that asked for a sign in (#112)', async () => {
    mount('/learning/course/7', { config: { homeRoute: studentsToTheirCourses }, signedIn: false })
    await signIn()
    expect(await screen.findByText('curso abierto')).toBeInTheDocument()
    expect(screen.getByLabelText('url')).toHaveTextContent(/^\/learning\/course\/7$/)
  })
})

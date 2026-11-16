import { QueryClient } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { vi } from 'vitest'
import { mockFetch, type FetchMock, type MockRoute } from '@wasichai/testing'
import { createApiClient, type ApiClient } from '../api/client'
import { resolveConfig } from '../app/config'
import { coreModule } from '../app/coreModule'
import { WasichaiProviders } from '../app/WasichaiProviders'
import { WasichaiRoutes } from '../app/WasichaiRoutes'
import type { OidcSession } from '../auth/oidcSession'
import { createWasichaiI18n } from '../i18n/createI18n'
import type { WasichaiModule } from '../registry/contract'
import { createRegistry } from '../registry/createRegistry'

// the realm as the app sees it. tests swap createOidcSession for this with vi.mock
export interface FakeRealmSession extends OidcSession {
  signIn: ReturnType<typeof vi.fn<(returnTo: string) => Promise<void>>>
  completeSignIn: ReturnType<typeof vi.fn<() => Promise<{ returnTo: string }>>>
  signOut: ReturnType<typeof vi.fn<() => Promise<void>>>
  signOutLocally: ReturnType<typeof vi.fn<() => Promise<void>>>
  current: ReturnType<typeof vi.fn<() => Promise<{ accessToken: string; name?: string } | null>>>
  // fires what the session's onExpired got
  expire(): void
}

export function fakeRealmSession(given: { accessToken: string; name?: string } | null = { accessToken: 'realm-token', name: 'Ana Pérez' }): FakeRealmSession {
  // like the real one: signing out locally forgets the user and its token
  let signedIn = given
  let expired: (() => void) | null = null
  // like the real one: signIn keeps returnTo in the request's state, the callback hands it back
  let pending: string | null = null
  return {
    signIn: vi.fn(async (returnTo: string) => {
      pending = returnTo
    }),
    completeSignIn: vi.fn(async () => {
      if (pending === null) throw new Error('No matching state found in storage')
      const returnTo = pending
      pending = null
      return { returnTo }
    }),
    signOut: vi.fn(async () => {}),
    signOutLocally: vi.fn(async () => {
      signedIn = null
    }),
    current: vi.fn(async () => signedIn),
    tokenSource: { get: () => signedIn?.accessToken ?? null, refresh: vi.fn(async () => false) },
    onExpired: vi.fn((handler: () => void) => {
      expired = handler
    }),
    expire: () => expired?.()
  }
}

export const REALM = { mode: 'oidc', issuer: 'https://sso.wasichai.test/realms/demo', clientId: 'catastro-web' } as const

const Sheets = () => <p>hojas del plano</p>
export const plansModule: WasichaiModule = { id: 'plans', basePath: 'plans', routes: [{ id: 'sheets', path: 'sheets', component: Sheets }] }

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

export interface RenderOidcOptions {
  route?: string
  // default: the app's routes
  ui?: ReactNode
  // answers besides /auth/config
  routes?: MockRoute[]
  strict?: boolean
}

export interface RenderOidcResult extends RenderResult {
  fetch: FetchMock
  apiClient: ApiClient
  queryClient: QueryClient
}

// the real providers and routes against a backend that answers oidc
export function renderOidc({ route = '/', ui, routes = [], strict = false }: RenderOidcOptions = {}): RenderOidcResult {
  const fetch = mockFetch([{ path: '/auth/config', body: REALM }, ...routes])
  const config = resolveConfig({ storagePrefix: 'oidc-test' })
  const apiClient = createApiClient({ baseUrl: config.apiBaseUrl, storagePrefix: config.storagePrefix })
  const registry = createRegistry([coreModule, plansModule])
  const i18n = createWasichaiI18n({ languages: config.languages, storageKey: apiClient.keys.lang, modules: registry.modules })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            {ui ?? <WasichaiRoutes />}
            <Where />
          </>
        )
      }
    ],
    { initialEntries: [route] }
  )
  const tree = (
    <WasichaiProviders config={config} registry={registry} apiClient={apiClient} i18n={i18n} queryClient={queryClient}>
      <RouterProvider router={router} />
    </WasichaiProviders>
  )
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return { ...view, fetch, apiClient, queryClient }
}

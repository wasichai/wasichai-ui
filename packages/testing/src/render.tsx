import { QueryClient } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import {
  WasichaiProviders,
  coreModule,
  CORE_MODULE_ID,
  createApiClient,
  createWasichaiI18n,
  createRegistry,
  resolveConfig,
  type AuthUser,
  type CallerPermissions,
  type WasichaiConfig,
  type WasichaiModule
} from '@wasichai/core'

export const TEST_USER: AuthUser = {
  id: 'u-test',
  email: 'tester@wasichai.test',
  displayName: 'Tester',
  organizationId: 'org-test',
  roles: ['ADMIN']
}

export const TEST_PERMISSIONS: CallerPermissions = { admin: true, objects: {} }

export interface WasichaiRenderOptions {
  // coreModule is always registered (like WasichaiApp does); pass it yourself only to reorder it, never to opt in
  modules?: WasichaiModule[]
  config?: Partial<WasichaiConfig>
  // initial url
  route?: string
  // route pattern the ui is mounted on, so useParams works ('data/objects/:object/edit')
  path?: string
  // undefined = TEST_USER / TEST_PERMISSIONS, null = signed out / none. never fetched
  user?: AuthUser | null
  permissions?: CallerPermissions | null
  // undefined = the first configured language, whatever an earlier test picked
  language?: string
}

export interface WasichaiRenderResult extends RenderResult {
  queryClient: QueryClient
}

// the same providers WasichaiApp mounts, around a MemoryRouter
export function renderWithProviders(ui: ReactElement, options: WasichaiRenderOptions = {}): WasichaiRenderResult {
  const config = resolveConfig({ storagePrefix: 'wasichai-test', ...options.config })
  // prepend coreModule unless the caller already listed it, so registering it twice never throws
  const modules = (options.modules ?? []).some((module) => module.id === CORE_MODULE_ID) ? (options.modules ?? []) : [coreModule, ...(options.modules ?? [])]
  const registry = createRegistry(modules)
  const apiClient = createApiClient({ baseUrl: config.apiBaseUrl, storagePrefix: config.storagePrefix })
  if (options.language) localStorage.setItem(apiClient.keys.lang, options.language)
  else localStorage.removeItem(apiClient.keys.lang)
  const i18n = createWasichaiI18n({ languages: config.languages, storageKey: apiClient.keys.lang, modules: registry.modules })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = options.user === undefined ? TEST_USER : options.user
  const permissions = options.permissions === undefined ? TEST_PERMISSIONS : options.permissions

  // one wrapper per call, so rerender keeps the same providers and cache
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WasichaiProviders
        config={config}
        registry={registry}
        apiClient={apiClient}
        i18n={i18n}
        queryClient={queryClient}
        initialUser={user}
        initialPermissions={permissions}
      >
        <MemoryRouter initialEntries={[options.route ?? '/']}>
          {options.path ? (
            <Routes>
              <Route path={options.path} element={children} />
            </Routes>
          ) : (
            children
          )}
        </MemoryRouter>
      </WasichaiProviders>
    )
  }

  // binding first, then spreading: spreading the call inline loses the bound query methods to a
  // TS inference quirk (contextual return type + generic default resolves Q to unknown)
  const result = render(ui, { wrapper: Wrapper })
  return { ...result, queryClient }
}

import { QueryClient } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import { createContext, useContext, useState, type ReactElement, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
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

const UiContext = createContext<ReactNode>(null)
const CurrentUi = () => <>{useContext(UiContext)}</>

// the same providers WasichaiApp mounts, around a memory data router
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

  // one wrapper per call, so rerender keeps the same providers, cache and router. a data router, as WasichaiApp's,
  // so a page with useBlocker can be tested (#128); its routes are fixed at creation, so the ui comes through context
  // and a rerender still reaches it
  function Wrapper({ children }: { children: ReactNode }) {
    const [router] = useState(() =>
      createMemoryRouter(
        options.path
          ? // off the pattern nothing shows, as a <Routes> with one <Route> did
            [
              { path: options.path, element: <CurrentUi /> },
              { path: '*', element: null }
            ]
          : [{ path: '*', element: <CurrentUi /> }],
        { initialEntries: [options.route ?? '/'] }
      )
    )
    return (
      <UiContext.Provider value={children}>
        <WasichaiProviders
          config={config}
          registry={registry}
          apiClient={apiClient}
          i18n={i18n}
          queryClient={queryClient}
          initialUser={user}
          initialPermissions={permissions}
        >
          <RouterProvider router={router} />
        </WasichaiProviders>
      </UiContext.Provider>
    )
  }

  // binding first, then spreading: spreading the call inline loses the bound query methods to a
  // TS inference quirk (contextual return type + generic default resolves Q to unknown)
  const result = render(ui, { wrapper: Wrapper })
  return { ...result, queryClient }
}

import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { i18n as I18n } from 'i18next'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { setActiveApiClient, type ApiClient } from '../api/client'
import { fetchAuthConfig, type AuthConfig } from '../auth/authConfig'
import { AuthProvider, BootScreen } from '../auth/AuthProvider'
import { ErrorState, LoadingState } from '../components/query-state/QueryState'
import { DocumentTitleSync } from '../organization/currentOrganization'
import type { WasichaiRegistry } from '../registry/createRegistry'
import { ThemeProvider } from '../theme/ThemeProvider'
import type { AuthUser, CallerPermissions } from '../types/auth'
import type { WasichaiConfig } from './config'
import { useApiClient, WasichaiContext } from './context'

export interface WasichaiProvidersProps {
  config: WasichaiConfig
  registry: WasichaiRegistry
  apiClient: ApiClient
  i18n: I18n
  queryClient: QueryClient
  initialUser?: AuthUser | null
  initialPermissions?: CallerPermissions | null
  // how people sign in. given: used, not fetched. absent: GET /auth/config, or local when initialUser is given
  authConfig?: AuthConfig
  children: ReactNode
}

const LOCAL: AuthConfig = { mode: 'local' }

type ConfigState = { config: AuthConfig } | { error: unknown } | null

// the mode before any sign-in shows: the login form of the wrong mode must never flash
function AuthConfigGate({ given, children }: { given: AuthConfig | undefined; children: (config: AuthConfig) => ReactNode }) {
  const client = useApiClient()
  const [state, setState] = useState<ConfigState>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (given) return
    let live = true
    fetchAuthConfig(client).then(
      (config) => live && setState({ config }),
      (error: unknown) => live && setState({ error })
    )
    return () => {
      live = false
    }
  }, [client, given, attempt])

  if (given) return children(given)
  if (state && 'config' in state) return children(state.config)
  return (
    <BootScreen>
      {state ? (
        <ErrorState
          error={state.error}
          onRetry={() => {
            setState(null)
            setAttempt((count) => count + 1)
          }}
        />
      ) : (
        <LoadingState />
      )}
    </BootScreen>
  )
}

// everything a wasichai screen needs above it. WasichaiApp adds the router, tests add a MemoryRouter.
export function WasichaiProviders({
  config,
  registry,
  apiClient,
  i18n,
  queryClient,
  initialUser,
  initialPermissions,
  authConfig,
  children
}: WasichaiProvidersProps) {
  // deliberate: useState's lazy initializer runs once during render, before any child's effects, so
  // the active client is set before a child's first query fires (an effect would run too late).
  // caveat: this makes WasichaiProviders client-only and single-render-per-mount. it is unsafe on the
  // server (no per-request isolation for the module-level "active" client — SSR needs its own
  // mechanism) and under React features that render without committing (strict mode double-render,
  // concurrent rendering), where a render that never commits can still flip the active client.
  useState(() => setActiveApiClient(apiClient))
  const value = useMemo(() => ({ config, registry, apiClient }), [config, registry, apiClient])
  // first module's provider outermost
  const wrapped = registry.providers.reduceRight<ReactNode>((inner, Provider) => <Provider>{inner}</Provider>, children)

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <WasichaiContext value={value}>
          {/* a given user is a local session (tests, embedders): nothing to ask the backend */}
          <AuthConfigGate given={authConfig ?? (initialUser !== undefined ? LOCAL : undefined)}>
            {(mode) => (
              <AuthProvider authConfig={mode} initialUser={initialUser} initialPermissions={initialPermissions}>
                <DocumentTitleSync />
                <ThemeProvider>{wrapped}</ThemeProvider>
              </AuthProvider>
            )}
          </AuthConfigGate>
        </WasichaiContext>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

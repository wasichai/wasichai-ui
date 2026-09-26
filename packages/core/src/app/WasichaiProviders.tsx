import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { i18n as I18n } from 'i18next'
import { useMemo, useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { setActiveApiClient, type ApiClient } from '../api/client'
import { AuthProvider } from '../auth/AuthProvider'
import type { WasichaiRegistry } from '../registry/createRegistry'
import { ThemeProvider } from '../theme/ThemeProvider'
import type { AuthUser, CallerPermissions } from '../types/auth'
import type { WasichaiConfig } from './config'
import { WasichaiContext } from './context'

export interface WasichaiProvidersProps {
  config: WasichaiConfig
  registry: WasichaiRegistry
  apiClient: ApiClient
  i18n: I18n
  queryClient: QueryClient
  initialUser?: AuthUser | null
  initialPermissions?: CallerPermissions | null
  children: ReactNode
}

// everything a wasichai screen needs above it. WasichaiApp adds the router, tests add a MemoryRouter.
export function WasichaiProviders({ config, registry, apiClient, i18n, queryClient, initialUser, initialPermissions, children }: WasichaiProvidersProps) {
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
          <AuthProvider initialUser={initialUser} initialPermissions={initialPermissions}>
            <ThemeProvider>{wrapped}</ThemeProvider>
          </AuthProvider>
        </WasichaiContext>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

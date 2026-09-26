import { QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter } from 'react-router'
import { createApiClient } from '../api/client'
import { createWasichaiI18n } from '../i18n/createI18n'
import type { WasichaiModule } from '../registry/contract'
import { createRegistry } from '../registry/createRegistry'
import { WasichaiProviders } from './WasichaiProviders'
import { WasichaiRoutes } from './WasichaiRoutes'
import { resolveConfig, type WasichaiConfig } from './config'
import { coreModule } from './coreModule'

export interface WasichaiAppProps {
  config?: Partial<WasichaiConfig>
  modules?: WasichaiModule[]
}

// the whole app from config + modules. both are read once, at mount: they are wiring, not state.
export function WasichaiApp({ config, modules = [] }: WasichaiAppProps) {
  const [app] = useState(() => {
    const resolved = resolveConfig(config)
    const registry = createRegistry([coreModule, ...modules])
    const apiClient = createApiClient({ baseUrl: resolved.apiBaseUrl, storagePrefix: resolved.storagePrefix })
    const i18n = createWasichaiI18n({ languages: resolved.languages, storageKey: apiClient.keys.lang, modules: registry.modules })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
    return { config: resolved, registry, apiClient, i18n, queryClient }
  })

  return (
    <WasichaiProviders config={app.config} registry={app.registry} apiClient={app.apiClient} i18n={app.i18n} queryClient={app.queryClient}>
      <BrowserRouter basename={app.config.basename}>
        <WasichaiRoutes />
      </BrowserRouter>
    </WasichaiProviders>
  )
}

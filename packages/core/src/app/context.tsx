import { createContext, use, useMemo } from 'react'
import type { ApiClient } from '../api/client'
import { useOptionalAuth } from '../auth/AuthProvider'
import { createLinks, type WasichaiLinks } from '../links/links'
import type { WasichaiRegistry } from '../registry/createRegistry'
import type { WasichaiConfig } from './config'
import { homePath, resolveHome } from './home'

export interface WasichaiContextValue {
  config: WasichaiConfig
  registry: WasichaiRegistry
  apiClient: ApiClient
}

export const WasichaiContext = createContext<WasichaiContextValue | null>(null)

export function useWasichai(): WasichaiContextValue {
  const value = use(WasichaiContext)
  if (!value) throw new Error('wasichai hooks must be used inside WasichaiApp (or WasichaiProviders)')
  return value
}

export function useWasichaiConfig(): WasichaiConfig {
  return useWasichai().config
}

export function useRegistry(): WasichaiRegistry {
  return useWasichai().registry
}

export function useApiClient(): ApiClient {
  return useWasichai().apiClient
}

// every in-app url goes through here, so a module mounted elsewhere is still found. home() follows config.homeRoute
export function useWasichaiLinks(): WasichaiLinks {
  const { config, registry } = useWasichai()
  const auth = useOptionalAuth()
  const user = auth?.user ?? null
  const permissions = auth?.permissions ?? null
  const permissionsError = auth?.permissionsError ?? null
  const home = useMemo(
    () => homePath(resolveHome(config.homeRoute, registry, { user, permissions, permissionsError })),
    [config.homeRoute, registry, user, permissions, permissionsError]
  )
  return useMemo(() => createLinks(registry, { home }), [registry, home])
}

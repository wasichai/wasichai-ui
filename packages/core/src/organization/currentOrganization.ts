import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiError } from '../api/client'
import { useApiClient, useWasichaiConfig } from '../app/context'
import type { AppText } from '../app/config'
import { useAuth } from '../auth/AuthProvider'

// GET /organizations/current: the caller's tenant
export interface CurrentOrganization {
  id: string
  name: string
  slug: string
  createdAt: string | null
}

export interface CurrentOrganizationOptions {
  // false = never ask. the shell passes it when no config text needs the org
  enabled?: boolean
}

// null while signed out, loading or when the request failed: callers draw a fallback, not an error
export function useCurrentOrganization(options: CurrentOrganizationOptions = {}): CurrentOrganization | null {
  const client = useApiClient()
  const { user } = useAuth()
  const query = useQuery<CurrentOrganization, ApiError>({
    queryKey: ['auth', 'organization', user?.organizationId ?? null],
    queryFn: () => client.request<CurrentOrganization>('/organizations/current'),
    enabled: user !== null && options.enabled !== false,
    // renaming a tenant is rare; sign out clears the cache anyway
    staleTime: Infinity
  })
  return user ? (query.data ?? null) : null
}

function resolveText(text: AppText | undefined, org: CurrentOrganization | null, fallback: string): string {
  if (text === undefined) return fallback
  return typeof text === 'function' ? text(org) : text
}

export interface AppTitle {
  appName: string
  appTagline: string
}

// the shell's header text. the org is only asked for when a config text is a function
export function useAppTitle(): AppTitle {
  const { t } = useTranslation()
  const config = useWasichaiConfig()
  const dynamic = typeof config.appName === 'function' || typeof config.appTagline === 'function'
  const org = useCurrentOrganization({ enabled: dynamic })
  return {
    appName: resolveText(config.appName, org, t('app.name')),
    appTagline: resolveText(config.appTagline, org, t('app.tagline'))
  }
}

// a string appName leaves the title to index.html, as before; a function one keeps it in step
export function DocumentTitleSync() {
  const config = useWasichaiConfig()
  const { appName } = useAppTitle()
  const sync = config.syncDocumentTitle !== false && typeof config.appName === 'function'
  useEffect(() => {
    if (sync) document.title = appName
  }, [sync, appName])
  return null
}

import type { ApiError } from '../api/client'
import { CORE_MODULE_ID } from '../links/links'
import { fillPath } from '../links/paths'
import type { WasichaiRegistry } from '../registry/createRegistry'
import type { AuthUser, CallerPermissions } from '../types/auth'
import type { HomeRoute } from './config'

export type HomeTarget = { kind: 'dashboard' } | { kind: 'loading' } | { kind: 'route'; path: string } | { kind: 'error'; error: Error }

export interface HomeAuth {
  user: AuthUser | null
  permissions: CallerPermissions | null
  permissionsError: ApiError | null
}

const DASHBOARD: HomeTarget = { kind: 'dashboard' }
const LOADING: HomeTarget = { kind: 'loading' }

// where '/' leads (#120). no homeRoute, signed out or permissions failed = the dashboard, as before. the dashboard
// is never a fallback while they load: it would mount and fetch, then leave
export function resolveHome(homeRoute: HomeRoute | undefined, registry: WasichaiRegistry, auth: HomeAuth | null): HomeTarget {
  if (!homeRoute || !auth?.user || auth.permissionsError) return DASHBOARD
  if (!auth.permissions) return LOADING
  const key = homeRoute(auth.permissions)
  if (!key || key === `${CORE_MODULE_ID}:home`) return DASHBOARD
  const route = registry.routes.find((candidate) => candidate.key === key)
  if (!route) return { kind: 'error', error: new Error(`wasichai: config.homeRoute returned '${key}', which is not a registered route`) }
  try {
    return { kind: 'route', path: fillPath(route.path) }
  } catch {
    return { kind: 'error', error: new Error(`wasichai: config.homeRoute returned '${key}', whose path '${route.path}' needs parameters`) }
  }
}

// the url links.home() answers: the chosen route once known, '/' otherwise (HomePage takes it from there)
export function homePath(target: HomeTarget): string | undefined {
  return target.kind === 'route' ? target.path : undefined
}

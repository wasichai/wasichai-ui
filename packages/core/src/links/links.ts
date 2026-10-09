import type { WasichaiRegistry } from '../registry/createRegistry'
import { fillPath, joinPath } from './paths'

export const CORE_MODULE_ID = 'core'

// the only place core spells its urls. coreModule mounts these, links build from these.
export const CORE_ROUTE_PATHS = {
  home: '',
  login: 'login',
  objects: 'data/objects',
  newObject: 'data/objects/new',
  editObject: 'data/objects/:object/edit',
  relationships: 'data/relationships',
  records: 'data/objects/:object/records',
  newRecord: 'data/objects/:object/records/new',
  record: 'data/objects/:object/records/:id',
  users: 'admin/users',
  roles: 'admin/roles',
  permissions: 'admin/permissions',
  audit: 'admin/audit',
  serviceAccounts: 'admin/service-accounts'
} as const

export type CoreRouteId = keyof typeof CORE_ROUTE_PATHS

// modules extend this by declaration merging to type `to()`'s route keys precisely, e.g.:
//   declare module '@wasichai/core' { interface WasichaiRouteMap { 'gis:map': true } }
// empty by default, so `to()` falls back to plain strings until something opts in.
export interface WasichaiRouteMap {}

type RouteKey = keyof WasichaiRouteMap extends never ? string : keyof WasichaiRouteMap

export interface WasichaiLinks {
  // any registered route by key (`gis:map`). params fill `:name` segments, search becomes ?a=b
  to<K extends RouteKey = RouteKey>(route: K, params?: Record<string, string>, search?: Record<string, string>): string
  has(route: RouteKey): boolean
  home(): string
  login(): string
  objects(): string
  newObject(): string
  editObject(object: string): string
  relationships(): string
  records(object: string): string
  newRecord(object: string): string
  record(object: string, id: string): string
  users(): string
  roles(): string
  permissions(): string
  audit(): string
  serviceAccounts(): string
}

function withSearch(path: string, search?: Record<string, string>): string {
  const query = search ? new URLSearchParams(search).toString() : ''
  return query ? `${path}?${query}` : path
}

export function createLinks(registry: WasichaiRegistry): WasichaiLinks {
  const paths = new Map(registry.routes.map((route) => [route.key, route.path]))
  const core = (id: CoreRouteId, params?: Record<string, string>) => fillPath(joinPath(CORE_ROUTE_PATHS[id]), params)

  return {
    to(route, params, search) {
      const pattern = paths.get(route)
      if (!pattern) throw new Error(`wasichai links: no route '${route}' is registered`)
      return withSearch(fillPath(pattern, params), search)
    },
    has: (route) => paths.has(route),
    home: () => core('home'),
    login: () => core('login'),
    objects: () => core('objects'),
    newObject: () => core('newObject'),
    editObject: (object) => core('editObject', { object }),
    relationships: () => core('relationships'),
    records: (object) => core('records', { object }),
    newRecord: (object) => core('newRecord', { object }),
    record: (object, id) => core('record', { object, id }),
    users: () => core('users'),
    roles: () => core('roles'),
    permissions: () => core('permissions'),
    audit: () => core('audit'),
    serviceAccounts: () => core('serviceAccounts')
  }
}

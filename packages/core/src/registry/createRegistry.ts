import { lazy, type ComponentType, type ReactNode } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { joinPath } from '../links/paths'
import { CORE_FIELD_TYPES, CORE_PAGE_COMPONENT_TYPES } from '../types/metadata'
import type { CallerPermissions } from '../types/auth'
import type {
  AuditValueFormatter,
  WasichaiModule,
  DashboardCardProps,
  FieldRenderer,
  HistoryRenderer,
  NavGroupContribution,
  ObjectColumn,
  ObjectDetailProps,
  ObjectFlagsHook,
  PageActionDefinition,
  PageComponentDefinition,
  RecordListActionProps,
  RecordPanelProps,
  RouteChrome
} from './contract'

export class RegistryError extends Error {}

// operations core draws itself (UPDATE lists its changes; CREATE and DELETE need nothing)
export const CORE_HISTORY_OPERATIONS = ['CREATE', 'UPDATE', 'DELETE'] as const

// core handles NAVIGATE itself; a module's pageActions add ACTION kinds beyond it
export const CORE_PAGE_ACTIONS = ['NAVIGATE'] as const

export interface ResolvedRoute {
  key: string
  moduleId: string
  // full react-router pattern, always starting with '/'
  path: string
  chrome: RouteChrome
  Component: ComponentType
}

export interface ResolvedNavItem {
  key: string
  labelKey: string
  to: string | null
  icon?: ComponentType<{ className?: string }>
  disabled: boolean
  visible?: (permissions: CallerPermissions | null) => boolean
  order: number
}

export interface ResolvedNavGroup {
  id: string
  labelKey: string
  items: ResolvedNavItem[]
}

export interface WasichaiRegistry {
  modules: readonly WasichaiModule[]
  routes: readonly ResolvedRoute[]
  navGroups: readonly ResolvedNavGroup[]
  fieldRenderers: Readonly<Record<string, FieldRenderer>>
  pageComponents: Readonly<Record<string, PageComponentDefinition>>
  pageActions: Readonly<Record<string, PageActionDefinition>>
  historyRenderers: Readonly<Record<string, HistoryRenderer>>
  recordPanels: readonly ComponentType<RecordPanelProps>[]
  recordListActions: readonly ComponentType<RecordListActionProps>[]
  dashboardCards: readonly ComponentType<DashboardCardProps>[]
  objectColumns: readonly ObjectColumn[]
  objectTileDetails: readonly ComponentType<ObjectDetailProps>[]
  auditValueFormatters: readonly AuditValueFormatter[]
  auditFieldLabels: Readonly<Record<string, string>>
  objectFlags: readonly ObjectFlagsHook[]
  recordQueryKeys: readonly ((objectName: string) => QueryKey[])[]
  providers: readonly ComponentType<{ children: ReactNode }>[]
}

const MODULE_ID = /^[a-z][a-z0-9-]*$/
// 'common' is core's i18n namespace. 'core' (CORE_MODULE_ID) is deliberately NOT reserved: the app's
// own built-in routes and nav (coreModule) register themselves as a WasichaiModule with that id, same
// as any other module.
const RESERVED_IDS = ['common']

// a section is flattened next to these in the record json (R6 on the backend); a section named
// after one of them would silently overwrite it instead of sitting beside it. mirrors the backend's
// FieldTypeRegistry.CORE_RECORD_KEYS.
const CORE_RECORD_KEYS = ['id', 'attributes', 'state', 'createdAt', 'updatedAt']

// validated once, at mount. a conflict is a wiring bug: fail before anything renders.
export function createRegistry(modules: WasichaiModule[]): WasichaiRegistry {
  checkIds(modules)
  checkFieldRendererSections(modules)
  checkFieldRendererSettingsKeys(modules)
  const routes = resolveRoutes(modules)
  const paths = new Map(routes.map((route) => [route.key, route.path]))

  return {
    modules,
    routes,
    navGroups: resolveNav(modules, paths),
    fieldRenderers: claim(modules, 'field type', (module) => module.fieldRenderers, CORE_FIELD_TYPES),
    pageComponents: claim(modules, 'page component', (module) => module.pageComponents, CORE_PAGE_COMPONENT_TYPES),
    pageActions: claim(modules, 'page action', (module) => module.pageActions, CORE_PAGE_ACTIONS),
    historyRenderers: claim(modules, 'history operation', (module) => module.historyRenderers, CORE_HISTORY_OPERATIONS),
    recordPanels: modules.flatMap((module) => module.recordPanels ?? []),
    recordListActions: modules.flatMap((module) => module.recordListActions ?? []),
    dashboardCards: modules.flatMap((module) => module.dashboardCards ?? []),
    objectColumns: modules.flatMap((module) => module.objectColumns ?? []),
    objectTileDetails: modules.flatMap((module) => module.objectTileDetails ?? []),
    auditValueFormatters: modules.flatMap((module) => module.auditValueFormatters ?? []),
    // same one-owner-per-name rule as field types and page components: a double claim must throw
    auditFieldLabels: claim(modules, 'audit field label', (module) => module.auditFieldLabels, []),
    objectFlags: modules.flatMap((module) => (module.objectFlags ? [module.objectFlags] : [])),
    recordQueryKeys: modules.flatMap((module) => (module.recordQueryKeys ? [module.recordQueryKeys] : [])),
    providers: modules.flatMap((module) => module.providers ?? [])
  }
}

function checkFieldRendererSections(modules: WasichaiModule[]) {
  for (const module of modules) {
    for (const [type, renderer] of Object.entries(module.fieldRenderers ?? {})) {
      if (CORE_RECORD_KEYS.includes(renderer.section))
        throw new RegistryError(`field type '${type}' of module '${module.id}' cannot use section '${renderer.section}': it collides with a core record key`)
    }
  }
}

// the object builder flattens every field renderer's settings.defaults into one map (objectDraft),
// keyed by setting name, not by module: two modules sharing a key would silently override each other.
function checkFieldRendererSettingsKeys(modules: WasichaiModule[]) {
  const owners = new Map<string, string>()
  for (const module of modules) {
    for (const renderer of Object.values(module.fieldRenderers ?? {})) {
      for (const key of Object.keys(renderer.settings?.defaults ?? {})) {
        const owner = owners.get(key)
        if (owner && owner !== module.id) throw new RegistryError(`field renderer setting '${key}' is claimed by both '${owner}' and '${module.id}'`)
        owners.set(key, module.id)
      }
    }
  }
}

function checkIds(modules: WasichaiModule[]) {
  const seen = new Set<string>()
  for (const module of modules) {
    if (!MODULE_ID.test(module.id)) throw new RegistryError(`module id '${module.id}' must match ${MODULE_ID}`)
    if (RESERVED_IDS.includes(module.id)) throw new RegistryError(`module id '${module.id}' is reserved`)
    if (seen.has(module.id)) throw new RegistryError(`module '${module.id}' is registered twice`)
    seen.add(module.id)
  }
}

// one owner per name; core names are not up for grabs
function claim<T>(modules: WasichaiModule[], what: string, pick: (module: WasichaiModule) => Record<string, T> | undefined, reserved: readonly string[]) {
  const owners = new Map<string, string>()
  const claimed: Record<string, T> = {}
  for (const module of modules) {
    for (const [name, value] of Object.entries(pick(module) ?? {})) {
      if (reserved.includes(name)) throw new RegistryError(`module '${module.id}' cannot claim core ${what} '${name}'`)
      const owner = owners.get(name)
      if (owner) throw new RegistryError(`${what} '${name}' is claimed by both '${owner}' and '${module.id}'`)
      owners.set(name, module.id)
      claimed[name] = value
    }
  }
  return claimed
}

// react-router syntax core does not support: optional segments and splats need a router-aware
// resolver to detect clashes and fill params, which fillPath/joinPath do not provide
function checkSegments(path: string, key: string) {
  for (const segment of path.split('/')) {
    if (segment.startsWith(':') && segment.endsWith('?'))
      throw new RegistryError(`route '${key}': optional segment '${segment}' is not supported, use two routes instead`)
    if (segment === '*' || segment.startsWith('*')) throw new RegistryError(`route '${key}': splat segment '${segment}' is not supported`)
  }
}

// ':id' and ':key' are the same shape once react-router fills them: normalise every param segment to
// ':' so two routes that would collide at runtime clash here, before anything renders
function shapeOf(path: string): string {
  return path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? ':' : segment))
    .join('/')
}

function resolveRoutes(modules: WasichaiModule[]): ResolvedRoute[] {
  const byShape = new Map<string, { key: string; path: string }>()
  const keys = new Set<string>()
  const routes: ResolvedRoute[] = []

  for (const module of modules) {
    for (const route of module.routes ?? []) {
      const key = `${module.id}:${route.id}`
      if (route.id.includes(':')) throw new RegistryError(`route id '${route.id}' of '${module.id}' must not contain ':'`)
      if (keys.has(key)) throw new RegistryError(`route '${key}' is declared twice`)
      if (Boolean(route.component) === Boolean(route.lazy)) throw new RegistryError(`route '${key}' needs exactly one of component or lazy`)
      const path = joinPath(module.basePath ?? '', route.path)
      checkSegments(path, key)
      const shape = shapeOf(path)
      const clash = byShape.get(shape)
      if (clash) throw new RegistryError(`routes '${clash.key}' and '${key}' both use path '${clash.path}'`)
      keys.add(key)
      byShape.set(shape, { key, path })
      routes.push({ key, moduleId: module.id, path, chrome: route.chrome ?? 'shell', Component: route.component ?? lazy(route.lazy!) })
    }
  }
  return routes
}

// a bare route id means "one of mine"
function qualify(moduleId: string, route: string): string {
  return route.includes(':') ? route : `${moduleId}:${route}`
}

function resolveNav(modules: WasichaiModule[], paths: Map<string, string>): ResolvedNavGroup[] {
  const groups = new Map<string, { group: NavGroupContribution; owner: string; items: ResolvedNavItem[] }>()
  for (const module of modules) {
    for (const group of module.navGroups ?? []) {
      const existing = groups.get(group.id)
      if (existing) throw new RegistryError(`nav group '${group.id}' is declared by both '${existing.owner}' and '${module.id}'`)
      groups.set(group.id, { group, owner: module.id, items: [] })
    }
  }

  const navKeys = new Set<string>()
  for (const module of modules) {
    for (const item of module.nav ?? []) {
      const target = groups.get(item.group)
      if (!target) throw new RegistryError(`module '${module.id}' puts '${item.labelKey}' in unknown nav group '${item.group}'`)
      const navKey = `${module.id}:${item.labelKey}`
      if (navKeys.has(navKey)) throw new RegistryError(`nav item '${navKey}' is declared twice`)
      navKeys.add(navKey)
      const routeKey = item.route ? qualify(module.id, item.route) : null
      const to = routeKey ? paths.get(routeKey) : undefined
      if (routeKey && !to) throw new RegistryError(`nav item '${item.labelKey}' points at unknown route '${routeKey}'`)
      if (to?.includes(':')) throw new RegistryError(`nav item '${item.labelKey}' points at '${routeKey}', which needs parameters`)
      // 'disabled: false' with no route is a contradiction: nothing to navigate to, nothing to enable
      if (item.disabled === false && !to) throw new RegistryError(`nav item '${navKey}' is disabled: false without a route`)
      target.items.push({
        key: navKey,
        labelKey: item.labelKey,
        to: to ?? null,
        icon: item.icon,
        disabled: item.disabled ?? !to,
        visible: item.visible,
        order: item.order
      })
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.group.order - b.group.order)
    .map(({ group, items }) => ({ id: group.id, labelKey: group.labelKey, items: items.sort((a, b) => a.order - b.order) }))
}

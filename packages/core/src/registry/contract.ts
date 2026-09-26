import type { QueryKey } from '@tanstack/react-query'
import type { ComponentType, ReactNode } from 'react'
import type { AuditEntry } from '../types/audit'
import type { CallerPermissions } from '../types/auth'
import type { FieldMeta, ObjectDefinition, ObjectSummary, PageComponent, RecordItem } from '../types/metadata'

// shell: inside the app shell, signed in. bare: signed in, no shell (a print sheet). public: no auth.
export type RouteChrome = 'shell' | 'bare' | 'public'

export interface RouteContribution {
  // unique inside the module. the route's key is `<moduleId>:<id>`; links and nav name it by that key
  id: string
  // react-router pattern relative to the module's basePath. '' is the module's index
  path: string
  // exactly one of the two. lazy keeps a heavy page out of the first bundle
  component?: ComponentType
  lazy?: () => Promise<{ default: ComponentType }>
  chrome?: RouteChrome
}

export interface NavGroupContribution {
  id: string
  // i18n key, namespace-qualified for modules ('gis:nav.gis')
  labelKey: string
  // sidebar position, lower first. core uses 10 data, 30 builder, 40 automation, 50 administration
  order: number
}

export interface NavContribution {
  group: string
  labelKey: string
  order: number
  // route key. a bare id means a route of the same module. none = a disabled placeholder
  route?: string
  icon?: ComponentType<{ className?: string }>
  disabled?: boolean
  // hide the entry from callers who would only be refused. absent = everyone sees it
  visible?: (permissions: CallerPermissions | null) => boolean
}

export interface FieldInputProps {
  field: FieldMeta
  value: unknown
  onChange: (value: unknown) => void
}

export interface FieldSettingsProps {
  settings: Record<string, string>
  onChange: (patch: Record<string, string>) => void
}

export interface FieldDisplayProps {
  field: FieldMeta
  value: unknown
}

// a field type a module adds. its values live in record[section][field.name], never in attributes,
// and the form hands them back under the same key.
export interface FieldRenderer {
  section: string
  // drawn full width where the field sits; it draws its own label
  input: ComponentType<FieldInputProps>
  // read-only rendering for detail pages and table cells. absent = core's default formatting
  display?: ComponentType<FieldDisplayProps>
  // false hides the unique toggle in the object editor
  uniqueAllowed?: boolean
  // extra inputs in the object builder's field form, kept as strings in the draft
  settings?: {
    defaults: Record<string, string>
    editor: ComponentType<FieldSettingsProps>
    toPayload: (settings: Record<string, string>) => Record<string, unknown>
  }
}

export interface PageComponentProps {
  component: PageComponent
  definition: ObjectDefinition
  record: RecordItem
}

export interface PageComponentSettingsProps {
  component: PageComponent
  // the settings editor often needs the object's own fields (gis: which shape field) and its
  // name (workflow: which transitions it offers), neither of which the component itself carries.
  definition: ObjectDefinition
  objectName: string
  onChange: (patch: Partial<PageComponent>) => void
}

// a page component type a module adds (gis: MAP, workflow: WORKFLOW). the pages builder needs a label
// and icon to offer it, and an optional settings editor to configure it, on top of drawing it.
export interface PageComponentDefinition {
  render: ComponentType<PageComponentProps>
  // i18n key, namespace-qualified, shown in the pages builder's component picker
  labelKey: string
  icon?: ComponentType<{ className?: string }>
  // absent = the component has no settings beyond the built-in ones (title, layout column...)
  settings?: ComponentType<PageComponentSettingsProps>
  // a read-only mock drawn inside the pages builder's canvas, from metadata already in hand. no
  // fetch, no interaction -- a real control there would eat the drag. absent = a blank placeholder.
  preview?: ComponentType<{ component: PageComponent; definition: ObjectDefinition }>
  // starting values for a freshly dropped component, merged over the blank node (gis: MAP with no
  // shape picked yet, workflow: ACTION defaulted to its own kind)
  defaults?: Partial<PageComponent>
}

export interface PageActionProps {
  component: PageComponent
  objectName: string
  recordId: string
}

// an ACTION kind a module adds (workflow: TRANSITION), on top of NAVIGATE. same shape a page
// component has: something to draw, a label for the inspector, and the same optional builder hooks.
export interface PageActionDefinition {
  render: ComponentType<PageActionProps>
  // i18n key, namespace-qualified, shown in the pages builder's action-kind picker
  labelKey: string
  settings?: ComponentType<PageComponentSettingsProps>
  defaults?: Partial<PageComponent>
}

export interface RecordPanelProps {
  objectName: string
  definition: ObjectDefinition
  record: RecordItem
}

export interface RecordListActionProps {
  objectName: string
  definition: ObjectDefinition
}

export interface HistoryEntryProps {
  entry: AuditEntry
}

// the badge's colour for a history operation. core's own three (CREATE/UPDATE/DELETE) keep their
// built-in look regardless; this is only for an operation a module adds.
export type HistoryTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

// a history operation a module adds (documents: ISSUE). core draws its own three; this is
// everything OperationBadge and the timeline need for any other one.
export interface HistoryRenderer {
  body: ComponentType<HistoryEntryProps>
  // i18n key, namespace-qualified (documents:operations.ISSUE)
  labelKey: string
  // absent = neutral, the same look UPDATE's badge has
  tone?: HistoryTone
}

// names an audit value the module recognises instead of dumping it
export interface AuditValueFormatter {
  matches: (value: unknown) => boolean
  // i18n key, namespace-qualified
  labelKey: string
}

export interface DashboardCardProps {
  objects: ObjectSummary[]
  loading: boolean
}

export interface ObjectDetailProps {
  object: ObjectSummary
}

export interface ObjectColumn {
  id: string
  headerKey: string
  cell: ComponentType<ObjectDetailProps>
}

// a hook: yes/no facts a module knows about an object. called on every render of the page that
// asks, so it must follow the rules of hooks.
export type ObjectFlagsHook = (objectName: string) => Record<string, boolean>

// what a module hands the app. every slot is optional: a module fills only what it needs.
export interface WasichaiModule {
  // lowercase, unique. also the module's i18n namespace and the prefix of its route keys
  id: string
  // url prefix of every route of the module. '' (default) mounts at the root
  basePath?: string
  routes?: RouteContribution[]
  navGroups?: NavGroupContribution[]
  nav?: NavContribution[]
  // field types the module adds (gis: its shape type). core types cannot be claimed
  fieldRenderers?: Record<string, FieldRenderer>
  // page component types the module draws, and offers the pages builder (gis: MAP, workflow: WORKFLOW)
  pageComponents?: Record<string, PageComponentDefinition>
  // ACTION kinds beyond NAVIGATE (workflow: TRANSITION)
  pageActions?: Record<string, PageActionDefinition>
  // drawn under the record detail page (documents: issued documents)
  recordPanels?: ComponentType<RecordPanelProps>[]
  // buttons in the record list header (gis: open on the map)
  recordListActions?: ComponentType<RecordListActionProps>[]
  // a history operation core does not draw itself (documents: ISSUE)
  historyRenderers?: Record<string, HistoryRenderer>
  auditValueFormatters?: AuditValueFormatter[]
  // audit field name -> i18n key, for columns that are not object fields
  auditFieldLabels?: Record<string, string>
  dashboardCards?: ComponentType<DashboardCardProps>[]
  objectColumns?: ObjectColumn[]
  // extra line on each object tile of the dashboard
  objectTileDetails?: ComponentType<ObjectDetailProps>[]
  objectFlags?: ObjectFlagsHook
  // query keys the module caches per object. a record or field write makes them stale (gis: features)
  recordQueryKeys?: (objectName: string) => QueryKey[]
  // wraps the whole app, outside the router: mounted for every route, including public ones like
  // login. modules wrap in order, so the first module's provider ends up outermost.
  providers?: ComponentType<{ children: ReactNode }>[]
  // language -> resources, loaded under the namespace `id`
  i18n?: Record<string, Record<string, unknown>>
}

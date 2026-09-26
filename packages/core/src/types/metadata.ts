// what the metadata api answers. modules add keys of their own to these payloads (gis puts its
// shape settings on fields and objects, and its shapes on records). core carries them through the
// index signatures untouched and never reads them.

export const CORE_FIELD_TYPES = ['TEXT', 'LONG_TEXT', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'EMAIL', 'URL', 'UUID', 'RELATION'] as const

export type CoreFieldType = (typeof CORE_FIELD_TYPES)[number]

// open: a module adds types through its field renderers. `string & {}` keeps editor hints for the core ones
export type FieldType = CoreFieldType | (string & {})

export interface FieldMeta {
  id: string
  name: string
  label: string
  type: FieldType
  required: boolean
  unique: boolean
  defaultValue: string | null
  description: string | null
  position: number
  enumOptions: string[] | null
  relationTarget: string | null
  visible: boolean
  editable: boolean
  [extension: string]: unknown
}

// where a system column lives: on every table, only once a workflow is attached, or nowhere yet
// — reserved for later.
export type SystemFieldScope = 'ALWAYS' | 'WORKFLOW' | 'RESERVED'

export interface SystemField {
  name: string
  // what to print beside the name, not something the field form can take
  type: string | null
  scope: SystemFieldScope
}

export interface ObjectSummary {
  id: string
  name: string
  label: string
  pluralLabel: string
  description: string | null
  enabled: boolean
  [extension: string]: unknown
}

export interface ObjectDefinition extends ObjectSummary {
  fields: FieldMeta[]
}

export interface RecordItem {
  id: string
  createdAt: string | null
  updatedAt: string | null
  attributes: Record<string, unknown>
  // module sections, flattened by the server next to attributes, keyed by field name
  [section: string]: unknown
}

export type RecordSection = Record<string, unknown>

// what a save sends: attributes plus one object per registered section
export interface RecordPayload {
  attributes: Record<string, unknown>
  [section: string]: Record<string, unknown>
}

// a section the record does not carry reads as empty, never as undefined
export function recordSection(record: RecordItem | undefined, section: string): RecordSection {
  const value = record?.[section]
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as RecordSection) : {}
}

export interface Paged<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type RelationshipType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'

export interface Relationship {
  id: string
  name: string
  label: string
  inverseLabel: string | null
  type: RelationshipType
  source: string
  target: string
  fieldName: string | null
  joinTable: string | null
}

// a relationship as seen from one object: who is on the other end, and whether it is a list
export interface RelatedSide {
  relationship: string
  label: string
  type: RelationshipType
  objectName: string
  objectLabel: string
  many: boolean
}

export const CORE_PAGE_COMPONENT_TYPES = [
  'PAGE',
  'REGION',
  'TABS',
  'TAB',
  'SECTION',
  'FORM',
  'DYNAMIC_FORM',
  'FIELD',
  'RELATED_LIST',
  'TEXT',
  'HISTORY',
  'ACTION'
] as const

export type CorePageComponentType = (typeof CORE_PAGE_COMPONENT_TYPES)[number]

// open: modules draw more through their page components
export type PageComponentType = CorePageComponentType | (string & {})

export type PageLayout = 'single-column' | 'two-column'

// NAVIGATE is core; other kinds come from modules' page actions
export type ActionKind = 'NAVIGATE' | (string & {})

export type ActionStyle = 'PRIMARY' | 'SECONDARY'

export interface TemplateRegion {
  name: string
  span: number
}

export interface TemplateRow {
  regions: TemplateRegion[]
}

// the catalogue is the backend's. name and region names are keys the client translates.
export interface PageTemplate {
  name: string
  columns: number
  rows: TemplateRow[]
}

export interface PageComponent {
  type: PageComponentType
  // which column of the PARENT container holds it
  column: number
  title: string | null
  // container: how it lays its own children out. a leaf ignores it.
  layout: PageLayout
  children: PageComponent[]
  relationship: string | null
  fields: string[] | null
  // a FORM component either names a stored form or lists fields, never both
  form?: string | null
  // only a FIELD carries these: which field it places, and what this placement shows of it.
  // null means "whatever the object says", not "true".
  field?: string | null
  visible?: boolean | null
  editable?: boolean | null
  content: string | null
  action?: ActionKind | null
  transition?: string | null
  target?: string | null
  url?: string | null
  style?: ActionStyle | null
  // only a REGION carries this: which of the template's regions it fills
  region?: string | null
  // module components keep their own settings here
  [extension: string]: unknown
}

// the record detail layout an admin configured. `generated` means nobody configured one and the
// server derived it from the object's metadata.
export interface Page {
  id: string
  name: string
  label: string
  objectName: string
  kind: 'RECORD_DETAIL'
  template: PageTemplate
  generated: boolean
  definition: { page: PageComponent }
}

export interface PagePayload {
  objectName: string
  name: string
  label: string
  kind: 'RECORD_DETAIL'
  template: string
  definition: { page: PageComponent }
}

export type SortDirection = 'ASC' | 'DESC'

export interface ViewDefinition {
  columns: string[]
  // field name -> exact value
  filters: Record<string, string>
  sort: { field: string; direction: SortDirection } | null
  pageSize: number
}

// a saved list configuration. `generated` means nobody saved one and the server derived it.
export interface View {
  id: string
  name: string
  label: string
  objectName: string
  isDefault: boolean
  generated: boolean
  definition: ViewDefinition
}

export interface ViewPayload {
  name: string
  label: string
  isDefault: boolean
  definition: ViewDefinition
}

export interface FormSection {
  title: string | null
  fields: string[]
}

// a named form layout. same generated/stored story as views and pages.
export interface Form {
  id: string
  name: string
  label: string
  objectName: string
  generated: boolean
  definition: { sections: FormSection[] }
}

export interface FormPayload {
  name: string
  label: string
  definition: { sections: FormSection[] }
}

import type { FieldRenderer } from '../../registry/contract'
import {
  CORE_FIELD_TYPES,
  type DeclaredAction,
  type FieldMeta,
  type FieldType,
  type ObjectDefinition,
  type SystemField,
  type SystemFieldScope
} from '../../types/metadata'

type Renderers = Readonly<Record<string, FieldRenderer>>

// the core types, then whatever the installed modules add, in registration order
export function addableFieldTypes(renderers: Renderers): FieldType[] {
  return [...CORE_FIELD_TYPES, ...Object.keys(renderers)]
}

export interface FieldDraft {
  name: string
  label: string
  type: FieldType
  required: boolean
  unique: boolean
  enumOptions: string
  relationTarget: string
  indexed: boolean
  // module settings as typed, keyed by the module's names; the payload converts them
  settings: Record<string, string>
}

// every module's defaults are there from the start, so switching the type back and forth keeps
// whatever was typed
export function emptyFieldDraft(renderers: Renderers = {}): FieldDraft {
  const settings: Record<string, string> = {}
  for (const renderer of Object.values(renderers)) Object.assign(settings, renderer.settings?.defaults)
  return { name: '', label: '', type: 'TEXT', required: false, unique: false, enumOptions: '', relationTarget: '', indexed: false, settings }
}

// the field as the api takes it. a module's settings go out only with the module's own type.
export function fieldPayload(draft: FieldDraft, renderers: Renderers): Record<string, unknown> {
  const settings = renderers[draft.type]?.settings
  return {
    name: draft.name.trim().toLowerCase(),
    label: draft.label.trim() || draft.name.trim(),
    type: draft.type,
    required: draft.required,
    unique: draft.unique,
    enumOptions:
      draft.type === 'ENUM'
        ? draft.enumOptions
            .split(',')
            .map((option) => option.trim())
            .filter(Boolean)
        : null,
    relationTarget: draft.type === 'RELATION' ? draft.relationTarget : null,
    // the server omits it unless true. a box ticked before the type changed to one it refuses stays home.
    ...(draft.indexed && indexable(draft.type, renderers) ? { indexed: true } : {}),
    ...(settings ? settings.toPayload(draft.settings) : {})
  }
}

export interface NameProblem {
  code: 'SYSTEM' | 'DUPLICATE'
  value: string
}

// the server refuses both of these. answering here saves the round trip and, more to the point,
// says so while the name is still being typed. it normalises the way the server does.
// the sql keyword list is deliberately not mirrored: that 400 already reaches the screen.
export function nameTaken(name: string, fields: { name: string }[], system: SystemField[]): NameProblem | null {
  const wanted = name.trim().toLowerCase()
  if (!wanted) return null
  if (system.some((column) => column.name === wanted)) return { code: 'SYSTEM', value: wanted }
  if (fields.some((field) => field.name === wanted)) return { code: 'DUPLICATE', value: wanted }
  return null
}

// workflow_state is a conditional column, and on this object the condition may already be met —
// saying "only with a workflow" about a table that has the column would be a plain lie.
export function scopeOf(column: SystemField, hasWorkflow: boolean): SystemFieldScope {
  if (column.scope === 'WORKFLOW') return hasWorkflow ? 'ALWAYS' : 'WORKFLOW'
  return column.scope
}

export interface ObjectDetailsDraft {
  label: string
  pluralLabel: string
  description: string
  enabled: boolean
  appendOnly: boolean
  apiOnly: boolean
  requiresReason: boolean
  indexes: string[][]
  uniqueConstraints: string[][]
}

// a server before 0.3.0 sends no flags and no lists: all off, none
export function detailsDraft(definition: ObjectDefinition): ObjectDetailsDraft {
  return {
    label: definition.label,
    pluralLabel: definition.pluralLabel,
    description: definition.description ?? '',
    enabled: definition.enabled,
    appendOnly: definition.appendOnly ?? false,
    apiOnly: definition.apiOnly ?? false,
    requiresReason: definition.requiresReason ?? false,
    indexes: definition.indexes ?? [],
    uniqueConstraints: definition.uniqueConstraints ?? []
  }
}

const FLAGS = ['appendOnly', 'apiOnly', 'requiresReason'] as const
const LISTS = ['indexes', 'uniqueConstraints'] as const

// the PUT keeps whatever it leaves out, so a rule or a list goes out only when the editor changed it:
// saving the labels must never rewrite a rule someone else just set. enabled defaults to true when
// omitted, so it always goes.
export function objectUpdatePayload(definition: ObjectDefinition, draft: ObjectDetailsDraft): Record<string, unknown> {
  const before = detailsDraft(definition)
  const payload: Record<string, unknown> = {
    label: draft.label.trim(),
    pluralLabel: draft.pluralLabel.trim() || draft.label.trim(),
    description: draft.description.trim() || null,
    enabled: draft.enabled
  }
  for (const flag of FLAGS) if (draft[flag] !== before[flag]) payload[flag] = draft[flag]
  for (const list of LISTS) if (JSON.stringify(draft[list]) !== JSON.stringify(before[list])) payload[list] = draft[list]
  return payload
}

// a refetch (any field or relationship change does one) must not wipe an unsaved edit: each key the
// editor changed since the last server answer stays, every other key takes the new answer
export function rebaseDetails(current: ObjectDetailsDraft, before: ObjectDetailsDraft, next: ObjectDetailsDraft): ObjectDetailsDraft {
  const rebased: Record<string, unknown> = { ...next }
  for (const key of Object.keys(next) as (keyof ObjectDetailsDraft)[]) {
    if (JSON.stringify(current[key]) !== JSON.stringify(before[key])) rebased[key] = current[key]
  }
  return rebased as unknown as ObjectDetailsDraft
}

export type FieldSetKind = 'indexes' | 'uniqueConstraints'

export type FieldSetProblemCode = 'EMPTY' | 'UNKNOWN' | 'REPEATED_FIELD' | 'TOO_FEW' | 'TOO_MANY' | 'NOT_INDEXABLE' | 'DUPLICATE_SET'

export interface FieldSetProblem {
  code: FieldSetProblemCode
  value?: string
}

// postgres INDEX_MAX_KEYS, the server's cap too
const MAX_SET_FIELDS = 32

// as the server normalises it. repeats stay, so the check can name them.
export function parseFieldSet(text: string): string[] {
  return text
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
}

// what the server refuses to index: long text can outgrow a btree entry, files it keeps out of
// filters (FieldSets.requireIndexable). files have no renderer here to say so. the shape type it also
// refuses comes from gis, whose renderer says uniqueAllowed: false (core must not name it).
const NOT_INDEXABLE_TYPES: readonly string[] = ['LONG_TEXT', 'FILE', 'IMAGE']

// a module type that cannot be unique is kept out of filters too
export function indexable(type: FieldType, renderers: Renderers): boolean {
  return !NOT_INDEXABLE_TYPES.includes(type) && renderers[type]?.uniqueAllowed !== false
}

// the 400s of FieldSets.kt, answered while typing. a set already in the list would be dropped
// silently by the server, so it is refused here instead.
export function fieldSetProblem(set: string[], kind: FieldSetKind, fields: FieldMeta[], existing: string[][], renderers: Renderers): FieldSetProblem | null {
  if (set.length === 0) return { code: 'EMPTY' }
  const repeated = set.find((name, index) => set.indexOf(name) !== index)
  if (repeated) return { code: 'REPEATED_FIELD', value: repeated }
  for (const name of set) {
    const field = fields.find((candidate) => candidate.name === name)
    if (!field) return { code: 'UNKNOWN', value: name }
    if (!indexable(field.type, renderers)) return { code: 'NOT_INDEXABLE', value: name }
  }
  // one field unique is unique: true on the field itself (ADR-037)
  if (kind === 'uniqueConstraints' && set.length < 2) return { code: 'TOO_FEW' }
  if (set.length > MAX_SET_FIELDS) return { code: 'TOO_MANY' }
  if (existing.some((other) => other.join(',') === set.join(','))) return { code: 'DUPLICATE_SET' }
  return null
}

// the platform's own actions: an object cannot declare one of these (ADR-042)
export const BUILT_IN_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE_METADATA', 'MANAGE_ORGANIZATION', 'MANAGE_TENANTS'] as const

const ACTION_NAME = /^[A-Z][A-Z0-9_]{1,48}$/

// the server's 400s and its 409, answered while typing. it upper-cases first, and so does this.
export function actionNameProblem(name: string, existing: DeclaredAction[]): 'SHAPE' | 'BUILT_IN' | 'DUPLICATE' | null {
  const wanted = name.trim().toUpperCase()
  if (!ACTION_NAME.test(wanted)) return 'SHAPE'
  if ((BUILT_IN_ACTIONS as readonly string[]).includes(wanted)) return 'BUILT_IN'
  if (existing.some((action) => action.name === wanted)) return 'DUPLICATE'
  return null
}

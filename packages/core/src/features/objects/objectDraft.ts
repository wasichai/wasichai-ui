import { ApiError } from '../../api/client'
import type { FieldRenderer } from '../../registry/contract'
import { CORE_FIELD_TYPES, type FieldType, type SystemField, type SystemFieldScope } from '../../types/metadata'

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
  // module settings as typed, keyed by the module's names; the payload converts them
  settings: Record<string, string>
}

// every module's defaults are there from the start, so switching the type back and forth keeps
// whatever was typed
export function emptyFieldDraft(renderers: Renderers = {}): FieldDraft {
  const settings: Record<string, string> = {}
  for (const renderer of Object.values(renderers)) Object.assign(settings, renderer.settings?.defaults)
  return { name: '', label: '', type: 'TEXT', required: false, unique: false, enumOptions: '', relationTarget: '', settings }
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

// a refusal names the field or the rule that blocked it. flattening it keeps that name on screen.
export function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    return [cause.message, ...cause.violations.map((violation) => `${violation.field}: ${violation.message}`)].join(' — ')
  }
  return String(cause)
}

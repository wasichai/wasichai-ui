import { getI18n } from 'react-i18next'
import type { AuditValueFormatter } from '../../registry/contract'
import type { AuditEntry, ChangeDescription } from '../../types/audit'
import type { ObjectDefinition } from '../../types/metadata'

// no server here: pure functions over an audit entry, the object metadata, and what modules told
// the registry about their own values.

export interface AuditExtensions {
  valueFormatters: readonly AuditValueFormatter[]
  fieldLabels: Readonly<Record<string, string>>
}

export const NO_AUDIT_EXTENSIONS: AuditExtensions = { valueFormatters: [], fieldLabels: {} }

// the instance the app initialised. these functions have no component to ask.
function t(key: string): string {
  return getI18n().t(key)
}

function language(): string {
  return getI18n()?.language || 'es'
}

// a value the user can read. never raw json: a module value (a shape) can be thousands of numbers.
export function formatAuditValue(value: unknown, extensions: AuditExtensions = NO_AUDIT_EXTENSIONS): string {
  if (value === null || value === undefined) return t('history.none')
  if (typeof value === 'boolean') return value ? t('history.yes') : t('history.no')
  if (typeof value === 'string') return value.trim() === '' ? t('history.none') : value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : t('history.none')
  const formatter = extensions.valueFormatters.find((candidate) => candidate.matches(value))
  if (formatter) return t(formatter.labelKey)
  if (typeof value === 'object') return t('history.complexValue')
  return String(value)
}

// objects compare by shape, everything else by identity. NaN never equals itself, Object.is fixes it.
function sameValue(before: unknown, after: unknown): boolean {
  if (before === null || before === undefined) return after === null || after === undefined
  if (typeof before === 'object' || typeof after === 'object') {
    return JSON.stringify(before ?? null) === JSON.stringify(after ?? null)
  }
  return Object.is(before, after)
}

// a field may have been deleted since the change was recorded. a module column keeps the name its
// module gave it; anything else falls back to its technical name.
function resolveLabel(field: string, definition: ObjectDefinition | undefined, extensions: AuditExtensions): string {
  const meta = definition?.fields.find((candidate) => candidate.name === field)
  if (meta) return meta.label
  const key = extensions.fieldLabels[field]
  return key ? t(key) : field
}

export function describeChanges(
  entry: Pick<AuditEntry, 'changes'>,
  definition: ObjectDefinition | undefined,
  extensions: AuditExtensions = NO_AUDIT_EXTENSIONS
): ChangeDescription[] {
  return (entry.changes ?? [])
    .filter((change) => !sameValue(change.before, change.after))
    .map((change) => ({
      field: change.field,
      label: resolveLabel(change.field, definition, extensions),
      before: formatAuditValue(change.before, extensions),
      after: formatAuditValue(change.after, extensions)
    }))
}

const BUCKETS: { limit: number; unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { limit: 60, unit: 'second', seconds: 1 },
  { limit: 3600, unit: 'minute', seconds: 60 },
  { limit: 86400, unit: 'hour', seconds: 3600 },
  { limit: 2592000, unit: 'day', seconds: 86400 },
  { limit: 31536000, unit: 'month', seconds: 2592000 }
]

// "hace 5 minutos" / "5 minutes ago", in whatever language i18n is on right now.
export function relativeTime(iso: string, now: Date | number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const elapsed = (typeof now === 'number' ? now : now.getTime()) - then
  const seconds = Math.abs(elapsed) / 1000
  const bucket = BUCKETS.find((candidate) => seconds < candidate.limit)
  const unit = bucket?.unit ?? 'year'
  const size = bucket?.seconds ?? 31536000
  const amount = Math.round(-elapsed / 1000 / size)
  const format = new Intl.RelativeTimeFormat(language(), { numeric: 'always' })
  return format.format(amount, unit)
}

// the exact moment, for the title attribute the relative time hides.
export function absoluteTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(language())
}

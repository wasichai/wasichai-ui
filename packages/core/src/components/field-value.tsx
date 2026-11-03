import { useTranslation } from 'react-i18next'
import { enumOptionLabel } from '../lib/localizedMetadata'
import type { FieldRenderer } from '../registry/contract'
import { recordSection, type FieldMeta, type RecordItem } from '../types/metadata'

// only a primitive has a plain-text form worth showing; an object/array falls back to the dash,
// same as an empty value, rather than printing '[object Object]'
function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return '—'
}

// where a field's value actually lives: its own section for a module field, attributes for a core one
export function readFieldValue(field: FieldMeta, record: RecordItem, fieldRenderers: Readonly<Record<string, FieldRenderer>>): unknown {
  const renderer = fieldRenderers[field.type]
  if (!renderer) return record.attributes[field.name]
  return recordSection(record, renderer.section)[field.name] ?? null
}

export interface FieldCellProps {
  field: FieldMeta
  record: RecordItem
  fieldRenderers: Readonly<Record<string, FieldRenderer>>
}

// read-only rendering shared by DataTable and RelatedList: a module's display component when it
// offers one (detail pages and table cells); absent, plain text formatting of the field's value,
// wherever it lives.
export function FieldCell({ field, record, fieldRenderers }: FieldCellProps) {
  const { i18n } = useTranslation()
  const renderer = fieldRenderers[field.type]
  const value = readFieldValue(field, record, fieldRenderers)
  if (renderer?.display) {
    const Display = renderer.display
    return <Display field={field} value={value} />
  }
  // an ENUM value reads as its option's text in the user's language; the value stays what is stored (#140)
  if (field.type === 'ENUM' && typeof value === 'string' && value !== '') return <>{enumOptionLabel(field, value, i18n.language)}</>
  return <>{renderValue(value)}</>
}

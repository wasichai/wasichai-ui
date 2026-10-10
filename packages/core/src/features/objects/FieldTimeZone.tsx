import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Label } from '@wasichai/ui'
import type { FieldMeta } from '../../types/metadata'
import { timeZoneProblem } from './objectDraft'

// a new DATETIME field's zone. the server would refuse a bad name with a 400; this says so while typing
export function DraftTimeZone({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5 sm:col-span-4">
      <Label>{t('objects.fieldTimeZone')}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="America/Lima" aria-label={t('objects.fieldTimeZone')} />
      <TimeZoneMessage value={value} />
    </div>
  )
}

// an existing field's zone, saved on blur like the label. the PUT reads null as "leave it", so a
// blank goes out as '' to clear it, as defaultValue does
export function SavedTimeZone({ field, onSave }: { field: FieldMeta; onSave: (timeZone: string) => void }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(field.timeZone ?? '')
  // a refetch with another zone (saved here or elsewhere) replaces what is shown
  const [stored, setStored] = useState(field.timeZone)
  if (field.timeZone !== stored) {
    setStored(field.timeZone)
    setValue(field.timeZone ?? '')
  }
  return (
    <div className="mt-1.5 space-y-1">
      <Input
        value={value}
        placeholder={t('objects.fieldTimeZone')}
        aria-label={`${t('objects.fieldTimeZone')} ${field.name}`}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = value.trim()
          if (timeZoneProblem(next)) return
          // the server answers one spelling: america/lima over America/Lima is no change
          if (next.toLowerCase() === (field.timeZone ?? '').toLowerCase()) return setValue(field.timeZone ?? '')
          onSave(next)
        }}
      />
      <TimeZoneMessage value={value} />
    </div>
  )
}

function TimeZoneMessage({ value }: { value: string }) {
  const { t } = useTranslation()
  return timeZoneProblem(value) ? (
    <p className="text-xs text-danger">{t('objects.fieldTimeZoneInvalid', { zone: value.trim() })}</p>
  ) : (
    <p className="text-xs text-ink-muted">{t('objects.fieldTimeZoneHint')}</p>
  )
}

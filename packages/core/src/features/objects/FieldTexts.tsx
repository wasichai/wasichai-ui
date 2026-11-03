import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Label } from '@wasichai/ui'
import type { FieldMeta, LocalizedTexts } from '../../types/metadata'
import { LanguageTexts, LanguageTextsHint } from './LanguageTexts'

export interface FieldTextsPayload {
  labels: LocalizedTexts
  descriptions: LocalizedTexts
  enumOptionLabels?: Record<string, LocalizedTexts>
}

// a field's texts per language: its label, its description and, for an ENUM, each option's (ADR-078). saved whole:
// the server replaces each map it is sent
export function FieldTexts({ field, saving, onSave }: { field: FieldMeta; saving: boolean; onSave: (payload: FieldTextsPayload) => void }) {
  const { t } = useTranslation()
  const [labels, setLabels] = useState<LocalizedTexts>(field.labels ?? {})
  const [descriptions, setDescriptions] = useState<LocalizedTexts>(field.descriptions ?? {})
  const [options, setOptions] = useState<Record<string, LocalizedTexts>>(field.enumOptionLabels ?? {})
  const isEnum = field.type === 'ENUM'

  const save = () => {
    // an option left with no text goes: the server would drop it anyway
    const enumOptionLabels = Object.fromEntries(Object.entries(options).filter(([, texts]) => Object.keys(texts).length > 0))
    onSave(isEnum ? { labels, descriptions, enumOptionLabels } : { labels, descriptions })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('objects.fieldLabel')}</Label>
        <LanguageTexts id={`label-${field.name}`} name={`${t('objects.fieldLabel')} ${field.name}`} texts={labels} onChange={setLabels} />
      </div>
      <div className="space-y-1.5">
        <Label>{t('objects.description')}</Label>
        <LanguageTexts id={`description-${field.name}`} name={`${t('objects.description')} ${field.name}`} texts={descriptions} onChange={setDescriptions} />
      </div>
      {isEnum
        ? (field.enumOptions ?? []).map((option) => (
            <div key={option} className="space-y-1.5">
              <Label className="font-mono">{option}</Label>
              <LanguageTexts
                id={`option-${field.name}-${option}`}
                name={`${t('objects.enumOption')} ${option}`}
                texts={options[option]}
                onChange={(texts) => setOptions((current) => ({ ...current, [option]: texts }))}
              />
            </div>
          ))
        : null}
      <LanguageTextsHint />
      <Button type="button" size="sm" disabled={saving} onClick={save}>
        {t('objects.saveTranslations')}
      </Button>
    </div>
  )
}

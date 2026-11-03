import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { FieldMeta, LocalizedTexts, ObjectDefinition, ObjectSummary, RelatedSide, Relationship } from '../types/metadata'

// the server keeps a text per language and never picks one (ADR-078). the client does, as for workflow labels
// (ADR-070): the active language, then its primary subtag (pt for pt-BR), then the single text
export function localizedText(text: string, texts: LocalizedTexts | null | undefined, language: string | undefined): string
export function localizedText(text: string | null, texts: LocalizedTexts | null | undefined, language: string | undefined): string | null
export function localizedText(text: string | null, texts: LocalizedTexts | null | undefined, language: string | undefined): string | null {
  if (!texts || !language) return text
  return texts[language] || texts[language.split('-')[0]] || text
}

export function objectLabel(object: ObjectSummary, language: string | undefined): string {
  return localizedText(object.label, object.labels, language)
}

export function objectPluralLabel(object: ObjectSummary, language: string | undefined): string {
  return localizedText(object.pluralLabel, object.pluralLabels, language)
}

export function objectDescription(object: ObjectSummary, language: string | undefined): string | null {
  return localizedText(object.description, object.descriptions, language)
}

// a field with no label reads as its name, as every core screen draws it
export function fieldLabel(field: FieldMeta, language: string | undefined): string {
  return localizedText(field.label || field.name, field.labels, language)
}

export function fieldDescription(field: FieldMeta, language: string | undefined): string | null {
  return localizedText(field.description, field.descriptions, language)
}

// what an ENUM option reads as. the value is what is stored and sent; an option with no text shows the value
export function enumOptionLabel(field: FieldMeta, option: string, language: string | undefined): string {
  return localizedText(option, field.enumOptionLabels?.[option], language)
}

export function relationshipLabel(relationship: Relationship, language: string | undefined): string {
  return localizedText(relationship.label, relationship.labels, language)
}

export function relationshipInverseLabel(relationship: Relationship, language: string | undefined): string | null {
  return localizedText(relationship.inverseLabel, relationship.inverseLabels, language)
}

// a related side: its own label, and the other object's plural one
export function sideLabel(side: RelatedSide, language: string | undefined): string {
  return localizedText(side.label, side.labels, language)
}

export function sideObjectLabel(side: RelatedSide, language: string | undefined): string {
  return localizedText(side.objectLabel, side.objectLabels, language)
}

// the same field with label and description in the language: for screens that read field.label. the maps stay, so
// localizing twice gives the same field
export function localizeField(field: FieldMeta, language: string | undefined): FieldMeta {
  if (!field.labels && !field.descriptions) return field
  return { ...field, label: fieldLabel(field, language), description: fieldDescription(field, language) }
}

// the same object with its texts and its fields' in the language. never for an editor: it would save them
export function localizeDefinition(definition: ObjectDefinition, language: string | undefined): ObjectDefinition
export function localizeDefinition(definition: ObjectDefinition | undefined, language: string | undefined): ObjectDefinition | undefined
export function localizeDefinition(definition: ObjectDefinition | undefined, language: string | undefined): ObjectDefinition | undefined {
  if (!definition) return definition
  return {
    ...definition,
    label: objectLabel(definition, language),
    pluralLabel: objectPluralLabel(definition, language),
    description: objectDescription(definition, language),
    fields: definition.fields.map((field) => localizeField(field, language))
  }
}

// the active language, and the definition in it again whenever it changes: a screen open while the user switches
// redraws without a reload
export function useLocalizedDefinition(definition: ObjectDefinition): ObjectDefinition
export function useLocalizedDefinition(definition: ObjectDefinition | undefined): ObjectDefinition | undefined
export function useLocalizedDefinition(definition: ObjectDefinition | undefined): ObjectDefinition | undefined {
  const { i18n } = useTranslation()
  const language = i18n.language
  return useMemo(() => localizeDefinition(definition, language), [definition, language])
}

export function useLocalizedFields(fields: FieldMeta[]): FieldMeta[] {
  const { i18n } = useTranslation()
  const language = i18n.language
  return useMemo(() => fields.map((field) => localizeField(field, language)), [fields, language])
}

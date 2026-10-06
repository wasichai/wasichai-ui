import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button, Input, Label } from '@wasichai/ui'
import { useRegistry } from '../../app/context'
import { buildRecordSchema, toAttributes, toFormValues } from '../../lib/metadata-to-zod'
import type { FieldRenderer } from '../../registry/contract'
import { CORE_FIELD_TYPES, recordSection, type FieldMeta, type Form, type ObjectDefinition, type RecordItem, type RecordPayload } from '../../types/metadata'
import { FieldInput } from './fields/FieldInput'

// only these travel through zod/attributes; anything else needs a module's renderer or gets the
// disabled placeholder, never a silent pass-through
const CORE_TYPES = new Set<string>(CORE_FIELD_TYPES)

export interface DynamicFormProps {
  definition: ObjectDefinition
  // a named layout: sections in order instead of one flat grid
  form?: Form
  record?: RecordItem
  submitting?: boolean
  error?: string | null
  onSubmit: (payload: RecordPayload) => void
  onCancel?: () => void
  // a page can show the same object twice (a page section plus its own FORM); only one may save.
  // the rest are read-along field groups: fields to look at, no button to press.
  readOnly?: boolean
}

type Sections = Record<string, Record<string, unknown>>

// every registered section starts from what the record holds. all of them go out on submit, drawn
// or not: the contract the original app had with its shape section.
function initialSections(renderers: Readonly<Record<string, FieldRenderer>>, record: RecordItem | undefined): Sections {
  const sections: Sections = {}
  for (const renderer of Object.values(renderers)) sections[renderer.section] = { ...recordSection(record, renderer.section) }
  return sections
}

// metadata in, working form out. adding a field to an object changes this form for free.
export function DynamicForm({ definition, form, record, submitting, error, onSubmit, onCancel, readOnly }: DynamicFormProps) {
  const { t } = useTranslation()
  const { fieldRenderers } = useRegistry()
  const sections = form ? resolveSections(form, definition.fields) : null
  const editable = definition.fields.filter((field) => field.visible)
  // a named form is the whole contract: validate and submit only what it shows
  const shown = sections ? sections.flatMap((section) => section.fields) : definition.fields
  // a module field never travels as an attribute: it has its own widget and its own payload slot.
  // a type that is neither core nor claimed by an installed module never travels either: nothing
  // here knows how to validate or store it (R3 leftover-type rule).
  const modelFields = shown.filter((field) => CORE_TYPES.has(field.type))
  const [extra, setExtra] = useState<Sections>(() => initialSections(fieldRenderers, record))

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildRecordSchema(modelFields)),
    defaultValues: toFormValues(modelFields, record?.attributes)
  })

  // a module field is a field, so it is drawn where the author put it instead of trailing the form
  const renderField = (field: FieldMeta) => {
    const renderer = fieldRenderers[field.type]
    if (renderer) {
      const FieldWidget = renderer.input
      return (
        <div key={field.id} className="sm:col-span-2">
          <FieldWidget
            field={field}
            value={extra[renderer.section]?.[field.name] ?? null}
            onChange={(value) => setExtra((current) => ({ ...current, [renderer.section]: { ...current[renderer.section], [field.name]: value } }))}
          />
        </div>
      )
    }
    if (!CORE_TYPES.has(field.type)) return <UnavailableField key={field.id} field={field} />
    return <FieldRow key={field.id} field={field} control={control} register={register} errors={errors} disabled={readOnly || !field.editable} />
  }

  return (
    // attributes goes last: a section can never clobber it, even though createRegistry already
    // refuses a section named 'attributes'
    <form className="space-y-5" noValidate onSubmit={handleSubmit((values) => onSubmit({ ...extra, attributes: toAttributes(modelFields, values) }))}>
      {error ? (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {sections ? (
        <div className="space-y-6">
          {sections.map((section, index) => (
            <section key={index} className="space-y-3">
              {section.title ? <h3 className="border-b border-border pb-1.5 text-sm font-semibold text-ink">{section.title}</h3> : null}
              <div className="grid gap-4 sm:grid-cols-2">{section.fields.map(renderField)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{editable.map(renderField)}</div>
      )}

      {readOnly ? null : (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.loading') : t('common.save')}
          </Button>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>
      )}
    </form>
  )
}

function FieldRow({
  field,
  control,
  register,
  errors,
  disabled
}: {
  field: FieldMeta
  control: Control<Record<string, unknown>>
  register: UseFormRegister<Record<string, unknown>>
  errors: FieldErrors<Record<string, unknown>>
  // toAttributes never sends a field the caller may not write: an input that took the edit would lie
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? <span className="ml-1 text-danger">*</span> : null}
      </Label>
      <FieldInput field={field} control={control} register={register} invalid={Boolean(errors[field.name])} disabled={disabled} />
      {field.description ? <p className="text-xs text-ink-muted">{field.description}</p> : null}
      {errors[field.name] ? <p className="text-xs text-danger">{String(errors[field.name]?.message ?? '')}</p> : null}
    </div>
  )
}

// a type that is neither core nor claimed by an installed module (the field's owning module is not
// registered): nothing here can edit or validate it, so it shows disabled rather than silently
// dropping or corrupting whatever the server already has for it.
function UnavailableField({ field }: { field: FieldMeta }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Input id={field.name} disabled readOnly value={t('records.typeUnavailable')} />
      {field.description ? <p className="text-xs text-ink-muted">{field.description}</p> : null}
    </div>
  )
}

// a section may name a field that was deleted meanwhile: skip it, keep the section
function resolveSections(form: Form, fields: FieldMeta[]): { title: string | null; fields: FieldMeta[] }[] {
  const byName = new Map(fields.map((field) => [field.name, field]))
  return form.definition.sections.map((section) => ({
    title: section.title,
    fields: section.fields.map((name) => byName.get(name)).filter((field): field is FieldMeta => field !== undefined)
  }))
}

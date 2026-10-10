import { useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button, Input, Label, Textarea } from '@wasichai/ui'
import type { FieldViolation } from '../../api/client'
import { useRegistry, useWasichaiConfig } from '../../app/context'
import { CHANGE_REASON_MAX_LENGTH, normalizeReason, reasonProblem, type ReasonProblem } from '../../lib/changeReason'
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
  // what the server refused, by field: drawn under a field the form shows, in the banner otherwise
  violations?: FieldViolation[]
  // reason only when the object requires one (requiresReason): trimmed, already valid
  onSubmit: (payload: RecordPayload, reason?: string) => void
  onCancel?: () => void
  // a page can show the same object twice (a page section plus its own FORM); only one may save.
  // the rest are read-along field groups: fields to look at, no button to press.
  readOnly?: boolean
  // IANA zone the DATETIME inputs are in; wins over config.timeZone. both unset = the browser's
  timeZone?: string
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
export function DynamicForm({ definition, form, record, submitting, error, violations = [], onSubmit, onCancel, readOnly, timeZone }: DynamicFormProps) {
  const { t } = useTranslation()
  const { fieldRenderers } = useRegistry()
  const config = useWasichaiConfig()
  const zone = { timeZone: timeZone ?? config.timeZone }
  const sections = form ? resolveSections(form, definition.fields) : null
  const editable = definition.fields.filter((field) => field.visible)
  // a named form is the whole contract: validate and submit only what it shows
  const shown = sections ? sections.flatMap((section) => section.fields) : definition.fields
  // a module field never travels as an attribute: it has its own widget and its own payload slot.
  // a type that is neither core nor claimed by an installed module never travels either: nothing
  // here knows how to validate or store it (R3 leftover-type rule).
  const modelFields = shown.filter((field) => CORE_TYPES.has(field.type))
  const [extra, setExtra] = useState<Sections>(() => initialSections(fieldRenderers, record))
  // a form that saves nothing asks nothing
  const asksReason = definition.requiresReason === true && !readOnly
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<ReasonProblem | null>(null)
  // a saved update moves updatedAt: the next edit asks anew
  const [savedAt, setSavedAt] = useState(record?.updatedAt)
  if (record?.updatedAt !== savedAt) {
    setSavedAt(record?.updatedAt)
    setReason('')
    setReasonError(null)
  }

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildRecordSchema(modelFields)),
    defaultValues: toFormValues(modelFields, record?.attributes, zone)
  })

  // a violation goes under the field it names when that field has an input here; the rest stay in the banner
  const drawn = new Set(
    (sections ? sections.flatMap((section) => section.fields) : editable)
      .filter((field) => Object.hasOwn(fieldRenderers, field.type) || CORE_TYPES.has(field.type))
      .map((field) => field.name)
  )
  if (asksReason) drawn.add('reason')
  const serverError = (name: string) => violations.find((violation) => violation.field === name)?.message
  const unplaced = violations.filter((violation) => !drawn.has(violation.field))

  // a module field is a field, so it is drawn where the author put it instead of trailing the form
  const renderField = (field: FieldMeta) => {
    const renderer = fieldRenderers[field.type]
    if (renderer) {
      const value = extra[renderer.section]?.[field.name] ?? null
      // a form that saves nothing shows the value and takes no edit it would drop
      if (readOnly && renderer.display) {
        const FieldDisplay = renderer.display
        return (
          <div key={field.id} className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium text-ink">{field.label}</p>
            <FieldDisplay field={field} value={value} />
          </div>
        )
      }
      const FieldWidget = renderer.input
      const widget = (
        <FieldWidget
          field={field}
          value={value}
          onChange={(next) => setExtra((current) => ({ ...current, [renderer.section]: { ...current[renderer.section], [field.name]: next } }))}
        />
      )
      const refused = serverError(field.name)
      return (
        <div key={field.id} className="space-y-1.5 sm:col-span-2">
          {/* no display to draw it with: the widget stays visible, inert */}
          {readOnly ? <div inert>{widget}</div> : widget}
          {refused ? <p className="text-xs text-danger">{refused}</p> : null}
        </div>
      )
    }
    if (!CORE_TYPES.has(field.type)) return <UnavailableField key={field.id} field={field} />
    return (
      <FieldRow
        key={field.id}
        field={field}
        control={control}
        register={register}
        errors={errors}
        serverError={serverError(field.name)}
        disabled={readOnly || !field.editable}
      />
    )
  }

  // the reason is checked beside the fields, so one press shows every problem at once
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const problem = asksReason ? reasonProblem(reason) : null
    setReasonError(problem)
    return handleSubmit((values) => {
      if (problem) return
      // attributes goes last: a section can never clobber it, even though createRegistry already
      // refuses a section named 'attributes'
      const payload = { ...extra, attributes: toAttributes(modelFields, values, zone) }
      return asksReason ? onSubmit(payload, normalizeReason(reason) ?? '') : onSubmit(payload)
    })(event)
  }
  const reasonMessage = reasonError ? t(`reason.problems.${reasonError}`, { max: CHANGE_REASON_MAX_LENGTH }) : serverError('reason')

  return (
    <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
      {error || unplaced.length > 0 ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error ? <p>{error}</p> : null}
          {unplaced.map((violation, index) => (
            <p key={index}>{`${violation.field}: ${violation.message}`}</p>
          ))}
        </div>
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

      {asksReason ? (
        <div className="space-y-1.5">
          <Label htmlFor="change-reason">
            {t('reason.label')}
            <span className="ml-1 text-danger">*</span>
          </Label>
          <Textarea
            id="change-reason"
            value={reason}
            aria-invalid={reasonMessage ? true : undefined}
            onChange={(event) => {
              setReason(event.target.value)
              setReasonError(null)
            }}
          />
          <p className="text-xs text-ink-muted">{t('reason.hint', { max: CHANGE_REASON_MAX_LENGTH })}</p>
          {reasonMessage ? <p className="text-xs text-danger">{reasonMessage}</p> : null}
        </div>
      ) : null}

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
  serverError,
  disabled
}: {
  field: FieldMeta
  control: Control<Record<string, unknown>>
  register: UseFormRegister<Record<string, unknown>>
  errors: FieldErrors<Record<string, unknown>>
  // what the server refused here; the client's own error is newer and wins
  serverError?: string
  // toAttributes never sends a field the caller may not write: an input that took the edit would lie
  disabled: boolean
}) {
  const message = errors[field.name] ? String(errors[field.name]?.message ?? '') : serverError
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? <span className="ml-1 text-danger">*</span> : null}
      </Label>
      <FieldInput field={field} control={control} register={register} invalid={Boolean(errors[field.name] || serverError)} disabled={disabled} />
      {field.description ? <p className="text-xs text-ink-muted">{field.description}</p> : null}
      {message ? <p className="text-xs text-danger">{message}</p> : null}
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

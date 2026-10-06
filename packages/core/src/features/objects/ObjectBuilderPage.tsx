import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input, Textarea } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { describeError } from '../../api/client'
import { useCreateObject, useObjects, useSystemFields } from '../../queries'
import type { FieldType } from '../../types/metadata'
import { addableFieldTypes, emptyFieldDraft, fieldPayload, nameTaken, type FieldDraft as SharedFieldDraft } from './objectDraft'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import type { FieldRenderer } from '../../registry/contract'
import { ModuleFieldSettings } from './ModuleFieldSettings'

// the editor's draft plus a key, because these rows exist before any field does
interface FieldDraft extends SharedFieldDraft {
  key: string
}

function emptyField(renderers: Readonly<Record<string, FieldRenderer>>): FieldDraft {
  return { key: crypto.randomUUID(), ...emptyFieldDraft(renderers) }
}

export function ObjectBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const links = useWasichaiLinks()
  const { fieldRenderers } = useRegistry()
  const createObject = useCreateObject()
  const { data: objects = [] } = useObjects()
  const { data: systemFields = [] } = useSystemFields()

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [pluralLabel, setPluralLabel] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FieldDraft[]>(() => [emptyField(fieldRenderers)])
  const [error, setError] = useState<string | null>(null)

  const patchField = (key: string, patch: Partial<FieldDraft>) =>
    setFields((current) => current.map((field) => (field.key === key ? { ...field, ...patch } : field)))

  // a draft compared against the whole list would always find itself
  const problemOf = (field: FieldDraft) =>
    nameTaken(
      field.name,
      fields.filter((other) => other.key !== field.key),
      systemFields
    )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const payload = {
      name: name.trim().toLowerCase(),
      label: label.trim(),
      pluralLabel: pluralLabel.trim() || label.trim(),
      description: description.trim() || null,
      fields: fields.filter((field) => field.name.trim()).map((field) => fieldPayload(field, fieldRenderers))
    }

    try {
      const created = await createObject.mutateAsync(payload)
      void navigate(links.records(created.name))
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={t('objects.new')}
        subtitle={t('objects.subtitle')}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => void navigate(-1)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createObject.isPending || fields.some((field) => problemOf(field) !== null)}>
              {t('common.save')}
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-8">
        {error ? <p className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>{t('objects.title')}</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('objects.name')}</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="predio" required />
              <p className="text-xs text-ink-muted">{t('objects.nameHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label">{t('objects.label')}</Label>
              <Input id="label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Predio" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pluralLabel">{t('objects.pluralLabel')}</Label>
              <Input id="pluralLabel" value={pluralLabel} onChange={(event) => setPluralLabel(event.target.value)} placeholder="Predios" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('objects.description')}</Label>
              <Textarea id="description" className="min-h-9" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t('objects.fields')}</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={() => setFields((current) => [...current, emptyField(fieldRenderers)])}>
              <Plus className="h-4 w-4" />
              {t('objects.addField')}
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="grid items-end gap-3 rounded-md border border-border p-4 sm:grid-cols-[1fr_1fr_170px_auto]">
                <div className="space-y-1.5">
                  <Label>{t('objects.fieldName')}</Label>
                  <Input value={field.name} onChange={(event) => patchField(field.key, { name: event.target.value })} placeholder="codigo" />
                  {problemOf(field) ? (
                    <p className="text-xs text-danger">{t(`objects.nameProblems.${problemOf(field)!.code}`, { name: problemOf(field)!.value })}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('objects.fieldLabel')}</Label>
                  <Input value={field.label} onChange={(event) => patchField(field.key, { label: event.target.value })} placeholder="Código" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('objects.fieldType')}</Label>
                  <Select value={field.type} onValueChange={(value) => patchField(field.key, { type: value as FieldType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {addableFieldTypes(fieldRenderers).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pb-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input type="checkbox" checked={field.required} onChange={(event) => patchField(field.key, { required: event.target.checked })} />
                    {t('objects.fieldRequired')}
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input type="checkbox" checked={field.unique} onChange={(event) => patchField(field.key, { unique: event.target.checked })} />
                    {t('objects.fieldUnique')}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    onClick={() => setFields((current) => current.filter((item) => item.key !== field.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {field.type === 'ENUM' ? (
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label>{t('objects.enumOptions')}</Label>
                    <Input
                      value={field.enumOptions}
                      onChange={(event) => patchField(field.key, { enumOptions: event.target.value })}
                      placeholder="RESIDENCIAL, COMERCIAL, INDUSTRIAL"
                    />
                  </div>
                ) : null}

                <ModuleFieldSettings
                  renderer={fieldRenderers[field.type]}
                  settings={field.settings}
                  onChange={(settings) => patchField(field.key, { settings })}
                />

                {field.type === 'RELATION' ? (
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label>{t('objects.relationTarget')}</Label>
                    <Select value={field.relationTarget} onValueChange={(value) => patchField(field.key, { relationTarget: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('map.selectObject')} />
                      </SelectTrigger>
                      <SelectContent>
                        {objects.map((item) => (
                          <SelectItem key={item.id} value={item.name}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </form>
  )
}

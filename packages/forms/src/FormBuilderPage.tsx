import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { ApiError, PageHeader, useDeleteForm, useForms, useObjectDefinition, useObjects, useSaveStoredForm } from '@wasichai/core'
import type { FieldMeta, Form, FormSection } from '@wasichai/core'
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'

const NEW = '__new__'

// form-based form editor. sections in, sections out; DynamicForm draws them.
export function FormBuilderPage() {
  // the builder's strings live in its own namespace; common.* and map.selectObject stay core's
  const { t } = useTranslation(['forms', 'common'])
  const { data: objects = [] } = useObjects()
  const [objectName, setObjectName] = useState('')
  const definition = useObjectDefinition(objectName || undefined)
  const forms = useForms(objectName || undefined)
  const save = useSaveStoredForm(objectName)
  const remove = useDeleteForm(objectName)
  const [formName, setFormName] = useState('')
  const [draft, setDraft] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fields = definition.data?.fields ?? []

  // the server is the source of truth: reload the draft whenever it answers again
  useEffect(() => {
    setError(null)
    if (formName === NEW) {
      setDraft(blankForm(objectName))
      return
    }
    const list = forms.data ?? []
    setDraft(list.find((item) => item.name === formName) ?? list[0] ?? null)
  }, [forms.data, formName, objectName])

  const sections = draft?.definition.sections ?? []
  // a field lives in exactly one section
  const assigned = new Set(sections.flatMap((section) => section.fields))

  const patchSections = (next: FormSection[]) => setDraft((current) => (current ? { ...current, definition: { sections: next } } : current))

  const patchSection = (index: number, patch: Partial<FormSection>) =>
    patchSections(sections.map((section, position) => (position === index ? { ...section, ...patch } : section)))

  const moveSection = (index: number, delta: number) => {
    const next = [...sections]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    patchSections(next)
  }

  const moveField = (index: number, position: number, delta: number) => {
    const names = [...sections[index].fields]
    const target = position + delta
    if (target < 0 || target >= names.length) return
    ;[names[position], names[target]] = [names[target], names[position]]
    patchSection(index, { fields: names })
  }

  const report = (cause: unknown) =>
    setError(cause instanceof ApiError ? [cause.message, ...cause.violations.map((v) => `${v.field}: ${v.message}`)].join(' — ') : String(cause))

  const submit = async () => {
    if (!draft) return
    setError(null)
    try {
      const saved = await save.mutateAsync({
        generated: draft.generated,
        form: { name: draft.name, label: draft.label, definition: draft.definition }
      })
      setFormName(saved.name)
    } catch (cause) {
      report(cause)
    }
  }

  const reset = async () => {
    if (!draft || draft.generated) return
    if (!window.confirm(t('forms.confirmReset'))) return
    setError(null)
    try {
      await remove.mutateAsync(draft.name)
      setFormName('')
    } catch (cause) {
      report(cause)
    }
  }

  return (
    <>
      <PageHeader title={t('forms.title')} subtitle={t('forms.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardBody className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('forms.object')}</Label>
              <Select
                value={objectName}
                onValueChange={(value) => {
                  setObjectName(value)
                  setFormName('')
                }}
              >
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

            {objectName ? (
              <div className="space-y-1.5">
                <Label>{t('forms.form')}</Label>
                <Select value={formName || draft?.name || ''} onValueChange={setFormName}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.pick')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(forms.data ?? []).map((item) => (
                      <SelectItem key={item.id || item.name} value={item.name}>
                        {item.label || item.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW}>{t('forms.newForm')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {!objectName ? null : forms.isLoading || !draft ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle>{draft.name || t('forms.newForm')}</CardTitle>
                  <Badge>{draft.generated ? t('forms.generated') : t('forms.stored')}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!draft.generated ? (
                    <Button variant="secondary" onClick={() => void reset()} disabled={remove.isPending}>
                      <RotateCcw className="h-4 w-4" />
                      {t('forms.reset')}
                    </Button>
                  ) : null}
                  <Button onClick={() => void submit()} disabled={save.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {draft.generated ? <p className="text-sm text-ink-muted">{t('forms.generatedHint')}</p> : null}
                {error ? <p className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">{error}</p> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="form-name">{t('forms.name')}</Label>
                    <Input
                      id="form-name"
                      value={draft.name}
                      disabled={!draft.generated}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    />
                    <p className="text-xs text-ink-muted">{t('forms.nameHint')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-label">{t('forms.label')}</Label>
                    <Input id="form-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>{t('forms.sections')}</CardTitle>
                <Button size="sm" variant="secondary" onClick={() => patchSections([...sections, { title: null, fields: [] }])}>
                  <Plus className="h-4 w-4" />
                  {t('forms.addSection')}
                </Button>
              </CardHeader>
              <CardBody className="space-y-4">
                {sections.length === 0 ? <p className="text-sm text-ink-muted">{t('forms.noSections')}</p> : null}

                {sections.map((section, index) => (
                  <div key={index} className="space-y-3 rounded-md border border-border p-4">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor={`section-title-${index}`}>{t('forms.sectionTitle')}</Label>
                        <Input
                          id={`section-title-${index}`}
                          value={section.title ?? ''}
                          onChange={(event) => patchSection(index, { title: event.target.value || null })}
                        />
                      </div>
                      <Button variant="ghost" size="icon" aria-label={t('forms.moveUp')} disabled={index === 0} onClick={() => moveSection(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('forms.moveDown')}
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('forms.removeSection')}
                        onClick={() => patchSections(sections.filter((_, position) => position !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {section.fields.length === 0 ? <p className="text-sm text-ink-muted">{t('forms.noFields')}</p> : null}
                      {section.fields.map((name, position) => (
                        <div key={name} className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
                          <span className="text-sm text-ink">{labelOf(fields, name)}</span>
                          <div className="ml-auto flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('forms.moveUp')}
                              disabled={position === 0}
                              onClick={() => moveField(index, position, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('forms.moveDown')}
                              disabled={position === section.fields.length - 1}
                              onClick={() => moveField(index, position, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('common.delete')}
                              onClick={() =>
                                patchSection(index, {
                                  fields: section.fields.filter((_, at) => at !== position)
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="w-64">
                        <Select value="" onValueChange={(value) => patchSection(index, { fields: [...section.fields, value] })}>
                          <SelectTrigger aria-label={`${t('forms.addField')} ${index + 1}`}>
                            <SelectValue placeholder={t('forms.addField')} />
                          </SelectTrigger>
                          <SelectContent>
                            {fields
                              .filter((field) => !assigned.has(field.name))
                              .map((field) => (
                                <SelectItem key={field.id} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function blankForm(objectName: string): Form {
  return {
    id: '',
    name: '',
    label: '',
    objectName,
    generated: true,
    definition: { sections: [{ title: null, fields: [] }] }
  }
}

// a section may name a field that was deleted meanwhile; show the raw name
function labelOf(fields: FieldMeta[], name: string): string {
  return fields.find((field) => field.name === name)?.label ?? name
}

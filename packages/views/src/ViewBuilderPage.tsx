import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, RotateCcw, Trash2 } from 'lucide-react'
import { ApiError, PageHeader, fallbackView, pickView, useDeleteView, useObjectDefinition, useObjects, useSaveView, useViews } from '@wasichai/core'
import type { FieldMeta, SortDirection, View } from '@wasichai/core'
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'

// radix has no empty value, so "nothing selected" needs a sentinel
const NEW = '__new__'
const NONE = '__none__'
const DIRECTIONS: SortDirection[] = ['ASC', 'DESC']

// form-based view editor, same shape as the page builder.
export function ViewBuilderPage() {
  // the builder's strings live in its own namespace; common.* and map.selectObject stay core's
  const { t } = useTranslation(['views', 'common'])
  const { data: objects = [] } = useObjects()
  const [objectName, setObjectName] = useState('')
  const definition = useObjectDefinition(objectName || undefined)
  const views = useViews(objectName || undefined)
  const save = useSaveView(objectName)
  const remove = useDeleteView(objectName)
  const [viewName, setViewName] = useState('')
  const [draft, setDraft] = useState<View | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fields = definition.data?.fields ?? []

  // the server is the source of truth: reload the draft whenever it answers again
  useEffect(() => {
    setError(null)
    if (viewName === NEW) {
      setDraft({ ...fallbackView(objectName, []), name: '', label: '' })
      return
    }
    setDraft(pickView(views.data ?? [], viewName))
  }, [views.data, viewName, objectName])

  const patchDefinition = (patch: Partial<View['definition']>) =>
    setDraft((current) => (current ? { ...current, definition: { ...current.definition, ...patch } } : current))

  const moveColumn = (index: number, delta: number) =>
    setDraft((current) => {
      if (!current) return current
      const columns = [...current.definition.columns]
      const target = index + delta
      if (target < 0 || target >= columns.length) return current
      ;[columns[index], columns[target]] = [columns[target], columns[index]]
      return { ...current, definition: { ...current.definition, columns } }
    })

  const report = (cause: unknown) =>
    setError(cause instanceof ApiError ? [cause.message, ...cause.violations.map((v) => `${v.field}: ${v.message}`)].join(' — ') : String(cause))

  const submit = async () => {
    if (!draft) return
    setError(null)
    try {
      const saved = await save.mutateAsync({
        generated: draft.generated,
        view: {
          name: draft.name,
          label: draft.label,
          isDefault: draft.isDefault,
          definition: draft.definition
        }
      })
      setViewName(saved.name)
    } catch (cause) {
      report(cause)
    }
  }

  const reset = async () => {
    if (!draft || draft.generated) return
    if (!window.confirm(t('views.confirmReset'))) return
    setError(null)
    try {
      await remove.mutateAsync(draft.name)
      setViewName('')
    } catch (cause) {
      report(cause)
    }
  }

  const chosen = draft?.definition.columns ?? []
  const filters = Object.entries(draft?.definition.filters ?? {})

  return (
    <>
      <PageHeader title={t('views.title')} subtitle={t('views.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardBody className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('views.object')}</Label>
              <Select
                value={objectName}
                onValueChange={(value) => {
                  setObjectName(value)
                  setViewName('')
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
                <Label>{t('views.view')}</Label>
                <div className="flex items-center gap-2">
                  <Select value={viewName || draft?.name || ''} onValueChange={setViewName}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('views.pick')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(views.data ?? []).map((item) => (
                        <SelectItem key={item.id || item.name} value={item.name}>
                          {item.label || item.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW}>{t('views.newView')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {!objectName ? null : views.isLoading || !draft ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle>{draft.name || t('views.newView')}</CardTitle>
                  <Badge>{draft.generated ? t('views.generated') : t('views.stored')}</Badge>
                  {draft.isDefault ? <Badge>{t('views.isDefault')}</Badge> : null}
                </div>
                <div className="flex items-center gap-2">
                  {!draft.generated ? (
                    <Button variant="secondary" onClick={() => void reset()} disabled={remove.isPending}>
                      <RotateCcw className="h-4 w-4" />
                      {t('views.reset')}
                    </Button>
                  ) : null}
                  <Button onClick={() => void submit()} disabled={save.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {draft.generated ? <p className="text-sm text-ink-muted">{t('views.generatedHint')}</p> : null}
                {error ? <p className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">{error}</p> : null}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="view-name">{t('views.name')}</Label>
                    <Input
                      id="view-name"
                      value={draft.name}
                      disabled={!draft.generated}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    />
                    <p className="text-xs text-ink-muted">{t('views.nameHint')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="view-label">{t('views.label')}</Label>
                    <Input id="view-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="view-page-size">{t('views.pageSize')}</Label>
                    <Input
                      id="view-page-size"
                      type="number"
                      min={1}
                      value={draft.definition.pageSize}
                      onChange={(event) => patchDefinition({ pageSize: Number(event.target.value) || 1 })}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })} />
                  {t('views.isDefault')}
                </label>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>{t('views.columns')}</CardTitle>
                <div className="w-56">
                  <Select value="" onValueChange={(value) => patchDefinition({ columns: [...chosen, value] })}>
                    <SelectTrigger aria-label={t('views.addColumn')}>
                      <SelectValue placeholder={t('views.addColumn')} />
                    </SelectTrigger>
                    <SelectContent>
                      {fields
                        .filter((field) => !chosen.includes(field.name))
                        .map((field) => (
                          <SelectItem key={field.id} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                {chosen.length === 0 ? <p className="text-sm text-ink-muted">{t('views.noColumns')}</p> : null}
                {chosen.map((name, index) => (
                  <div key={name} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <span className="text-sm text-ink">{labelOf(fields, name)}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label={t('views.moveUp')} disabled={index === 0} onClick={() => moveColumn(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('views.moveDown')}
                        disabled={index === chosen.length - 1}
                        onClick={() => moveColumn(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common.delete')}
                        onClick={() =>
                          patchDefinition({
                            columns: chosen.filter((_, position) => position !== index)
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>{t('views.filters')}</CardTitle>
                <div className="w-56">
                  <Select value="" onValueChange={(value) => patchDefinition({ filters: { ...draft.definition.filters, [value]: '' } })}>
                    <SelectTrigger aria-label={t('views.addFilter')}>
                      <SelectValue placeholder={t('views.addFilter')} />
                    </SelectTrigger>
                    <SelectContent>
                      {fields
                        .filter((field) => !(field.name in draft.definition.filters))
                        .map((field) => (
                          <SelectItem key={field.id} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                {filters.length === 0 ? <p className="text-sm text-ink-muted">{t('views.noFilters')}</p> : null}
                {filters.map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-56 text-sm text-ink">{labelOf(fields, name)}</span>
                    <Input
                      aria-label={`${t('views.filterValue')} ${name}`}
                      value={value}
                      onChange={(event) =>
                        patchDefinition({
                          filters: { ...draft.definition.filters, [name]: event.target.value }
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      onClick={() => patchDefinition({ filters: without(draft.definition.filters, name) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('views.sort')}</CardTitle>
              </CardHeader>
              <CardBody className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('views.sortField')}</Label>
                  <Select
                    value={draft.definition.sort?.field ?? NONE}
                    onValueChange={(value) =>
                      patchDefinition({
                        sort:
                          value === NONE
                            ? null
                            : {
                                field: value,
                                direction: draft.definition.sort?.direction ?? 'ASC'
                              }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t('views.noSort')}</SelectItem>
                      {fields.map((field) => (
                        <SelectItem key={field.id} value={field.name}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('views.sortDirection')}</Label>
                  <Select
                    value={draft.definition.sort?.direction ?? 'ASC'}
                    disabled={!draft.definition.sort}
                    onValueChange={(value) =>
                      patchDefinition({
                        sort: draft.definition.sort ? { ...draft.definition.sort, direction: value as SortDirection } : null
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map((direction) => (
                        <SelectItem key={direction} value={direction}>
                          {t(`views.directions.${direction}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

// a column may outlive the field it names; show the raw name rather than nothing
function labelOf(fields: FieldMeta[], name: string): string {
  return fields.find((field) => field.name === name)?.label ?? name
}

function without(filters: Record<string, string>, name: string): Record<string, string> {
  const next = { ...filters }
  delete next[name]
  return next
}

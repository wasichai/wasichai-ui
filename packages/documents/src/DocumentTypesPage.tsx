import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EMPTY_TEMPLATE, TemplateEditor } from './TemplateEditor'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { ApiError } from '@wasichai/core'
import { useObjectDefinition, useObjectRelationships, useObjects } from '@wasichai/core'
import { useDeleteDocumentType, useDocumentTypes, useSaveDocumentType } from './api'
import { cn } from '@wasichai/ui'
import type { DocumentType, TemplateNode } from './types'

interface Draft {
  name: string
  label: string
  prefix: string
  template: TemplateNode
  existing: boolean
}

// one document type is a template an admin writes once and a record issues many times
export function DocumentTypesPage() {
  const { t } = useTranslation(['documents', 'common'])
  const [objectName, setObjectName] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const objects = useObjects()
  const definition = useObjectDefinition(objectName || undefined)
  const relationships = useObjectRelationships(objectName || undefined)
  const types = useDocumentTypes(objectName || undefined)
  const save = useSaveDocumentType(objectName)
  const remove = useDeleteDocumentType(objectName)

  // a different object is a different set of types: never keep one open across the change
  useEffect(() => {
    setDraft(null)
    setError(null)
  }, [objectName])

  const open = (type: DocumentType) => setDraft({ name: type.name, label: type.label, prefix: type.prefix, template: type.template, existing: true })

  const submit = async () => {
    if (!draft) return
    setError(null)
    try {
      await save.mutateAsync({ existing: draft.existing, type: { name: draft.name, label: draft.label, prefix: draft.prefix, template: draft.template } })
      setDraft({ ...draft, existing: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : String(cause))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{t('documents.title')}</h1>
        <p className="text-sm text-ink-muted">{t('documents.subtitle')}</p>
      </div>

      <div className="space-y-1.5">
        <Label>{t('documents.object')}</Label>
        <Select value={objectName} onValueChange={setObjectName}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={t('documents.pickObject')} />
          </SelectTrigger>
          <SelectContent>
            {(objects.data ?? []).map((item) => (
              <SelectItem key={item.name} value={item.name}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {definition.data ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-3">
            <CardHeader className="flex items-center justify-between gap-2">
              <CardTitle>{t('documents.types')}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('documents.newType')}
                onClick={() => setDraft({ name: '', label: '', prefix: '', template: EMPTY_TEMPLATE, existing: false })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardBody className="space-y-1">
              {(types.data ?? []).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => open(type)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted',
                    draft?.existing && draft.name === type.name && 'bg-surface-muted font-medium'
                  )}
                >
                  <span className="truncate">{type.label}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{type.prefix}</span>
                </button>
              ))}
              {(types.data ?? []).length === 0 ? <p className="px-2 text-xs text-ink-muted">{t('documents.noTypes')}</p> : null}
            </CardBody>
          </Card>

          {draft ? (
            <Card className="lg:col-span-9">
              <CardHeader className="flex items-center justify-between gap-2">
                <CardTitle>{draft.existing ? draft.label : t('documents.newType')}</CardTitle>
                <div className="flex items-center gap-2">
                  {draft.existing ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      disabled={remove.isPending}
                      onClick={async () => {
                        if (!window.confirm(t('documents.confirmDelete'))) return
                        setError(null)
                        // a type that ever issued a document is refused (409): say so, keep it open
                        try {
                          await remove.mutateAsync(draft.name)
                          setDraft(null)
                        } catch (cause) {
                          setError(cause instanceof ApiError ? cause.message : String(cause))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button onClick={submit} disabled={save.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {error ? (
                  <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="type-name">{t('documents.name')}</Label>
                    <Input id="type-name" value={draft.name} disabled={draft.existing} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="type-label">{t('documents.label')}</Label>
                    <Input id="type-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="type-prefix">{t('documents.prefix')}</Label>
                    <Input id="type-prefix" value={draft.prefix} onChange={(event) => setDraft({ ...draft, prefix: event.target.value })} />
                    <p className="text-xs text-ink-muted">{t('documents.prefixHint')}</p>
                  </div>
                </div>
                <TemplateEditor
                  value={draft.template}
                  onChange={(template) => setDraft({ ...draft, template })}
                  definition={definition.data}
                  sides={relationships.data ?? []}
                />
              </CardBody>
            </Card>
          ) : (
            <Card className="lg:col-span-9">
              <CardBody>
                <p className="text-sm text-ink-muted">{t('documents.pickType')}</p>
              </CardBody>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}

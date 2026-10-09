import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input, Textarea } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import {
  useAddField,
  useDeleteField,
  useDeleteObject,
  useObjectDefinition,
  useObjects,
  useRelationships,
  useSystemFields,
  useUpdateField,
  useUpdateObject
} from '../../queries'
import type { FieldMeta, FieldType } from '../../types/metadata'
import { describeError } from '../../api/client'
import {
  addableFieldTypes,
  detailsDraft,
  emptyFieldDraft,
  fieldPayload,
  indexable,
  nameTaken,
  objectUpdatePayload,
  rebaseDetails,
  scopeOf,
  type FieldDraft,
  type ObjectDetailsDraft
} from './objectDraft'
import { ObjectActions } from './ObjectActions'
import { ObjectFieldSets } from './ObjectFieldSets'
import { ObjectRelationships } from './ObjectRelationships'
import { relationshipOfField } from './relationshipSides'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import { useObjectFlags } from '../../registry/hooks'
import { ModuleFieldSettings } from './ModuleFieldSettings'

export function ObjectEditorPage() {
  const { object = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: definition, isLoading } = useObjectDefinition(object)
  const { data: objects = [] } = useObjects()
  const { data: systemFields = [] } = useSystemFields()
  const { data: relationships = [] } = useRelationships()
  // modules answer facts about the object (workflow: whether one is attached, so its state column exists)
  const flags = useObjectFlags(object)
  const { fieldRenderers } = useRegistry()
  const links = useWasichaiLinks()
  const updateObject = useUpdateObject(object)
  const deleteObject = useDeleteObject()
  const addField = useAddField(object)
  const updateField = useUpdateField(object)
  const deleteField = useDeleteField(object)

  // labels, write rules and field sets: everything the object's PUT carries
  const [details, setDetails] = useState<ObjectDetailsDraft | null>(() => (definition ? detailsDraft(definition) : null))
  // the server's answer the draft was last based on, to tell the user's edits from stale values.
  // keyed by object: moving to another object's editor keeps this component, not its edits.
  const baseline = useRef<{ name: string; draft: ObjectDetailsDraft } | null>(definition ? { name: definition.name, draft: detailsDraft(definition) } : null)
  const [draft, setDraft] = useState<FieldDraft | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [systemOpen, setSystemOpen] = useState(false)

  // the server owns the truth; the form only borrows it. a refetch keeps what the user changed and has not saved.
  useEffect(() => {
    if (!definition) return
    const next = detailsDraft(definition)
    const before = baseline.current?.name === definition.name ? baseline.current.draft : null
    setDetails((current) => (current && before ? rebaseDetails(current, before, next) : next))
    baseline.current = { name: definition.name, draft: next }
  }, [definition])

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setSaved(false)
    try {
      await action()
      setSaved(true)
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  // only what changed of the rules and lists goes out: the PUT keeps what it is not sent
  const saveDetails = () => {
    // the field-sets Save skips the form's own required check
    if (definition && details?.label.trim()) void run(() => updateObject.mutateAsync(objectUpdatePayload(definition, details)))
  }

  const submitField = () => {
    if (!draft || !draft.name.trim() || nameTaken(draft.name, definition?.fields ?? [], systemFields)) return
    void run(async () => {
      await addField.mutateAsync(fieldPayload(draft, fieldRenderers))
      setDraft(null)
    })
  }

  const removeField = (field: FieldMeta) => {
    if (!window.confirm(t('objects.confirmDeleteField', { field: field.label }))) return
    void run(() => deleteField.mutateAsync(field.name))
  }

  const removeObject = () =>
    void run(async () => {
      await deleteObject.mutateAsync(object)
      void navigate(links.objects())
    })

  if (isLoading || !definition || !details) {
    return (
      <>
        <PageHeader title={t('objects.edit')} subtitle={object} />
        <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
      </>
    )
  }

  const problem = draft ? nameTaken(draft.name, definition.fields, systemFields) : null
  const edit = (change: Partial<ObjectDetailsDraft>) => setDetails((current) => current && { ...current, ...change })

  return (
    <>
      <PageHeader
        title={definition.label}
        subtitle={t('objects.editSubtitle')}
        actions={
          <Button variant="secondary" asChild>
            <Link to={links.records(object)}>{t('objects.openRecords')}</Link>
          </Button>
        }
      />

      <div className="space-y-5 p-8">
        {error ? (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {saved && !error ? <p className="rounded-md border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success">{t('objects.saved')}</p> : null}

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            saveDetails()
          }}
        >
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t('objects.details')}</CardTitle>
              <Button type="submit" size="sm" disabled={updateObject.isPending}>
                {t('common.save')}
              </Button>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('objects.name')}</Label>
                <Input id="name" value={definition.name} readOnly disabled className="font-mono" />
                <p className="text-xs text-ink-muted">{t('objects.immutableName')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="label">{t('objects.label')}</Label>
                <Input id="label" value={details.label} onChange={(event) => edit({ label: event.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pluralLabel">{t('objects.pluralLabel')}</Label>
                <Input id="pluralLabel" value={details.pluralLabel} onChange={(event) => edit({ pluralLabel: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">{t('objects.description')}</Label>
                <Textarea id="description" className="min-h-9" value={details.description} onChange={(event) => edit({ description: event.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={details.enabled} onChange={(event) => edit({ enabled: event.target.checked })} />
                  {t('objects.enabled')}
                </label>
                <p className="text-xs text-ink-muted">{t('objects.enabledHint')}</p>
              </div>
              {/* ADR-040, ADR-041: what the generic api and the screens refuse on this object's records */}
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="mb-1 text-sm font-semibold">{t('objects.writeRules')}</legend>
                {(['appendOnly', 'apiOnly', 'requiresReason'] as const).map((rule) => (
                  <div key={rule}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={details[rule]} onChange={(event) => edit({ [rule]: event.target.checked })} />
                      {t(`objects.${rule}`)}
                    </label>
                    <p className="text-xs text-ink-muted">{t(`objects.${rule}Hint`)}</p>
                  </div>
                ))}
              </fieldset>
            </CardBody>
          </Card>
        </form>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t('objects.fields')}</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDraft(draft ? null : emptyFieldDraft(fieldRenderers))}>
              <Plus className="h-4 w-4" />
              {t('objects.addField')}
            </Button>
          </CardHeader>

          {draft ? (
            <CardBody className="border-b border-border">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_170px_auto]">
                <div className="space-y-1.5">
                  <Label>{t('objects.fieldName')}</Label>
                  <Input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="codigo"
                    aria-label={t('objects.fieldName')}
                  />
                  {problem ? <p className="text-xs text-danger">{t(`objects.nameProblems.${problem.code}`, { name: problem.value })}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('objects.fieldLabel')}</Label>
                  <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} aria-label={t('objects.fieldLabel')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('objects.fieldType')}</Label>
                  <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as FieldType })}>
                    <SelectTrigger aria-label={t('objects.fieldType')}>
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
                    <input type="checkbox" checked={draft.required} onChange={(event) => setDraft({ ...draft, required: event.target.checked })} />
                    {t('objects.fieldRequired')}
                  </label>
                  {fieldRenderers[draft.type]?.uniqueAllowed === false ? null : (
                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <input type="checkbox" checked={draft.unique} onChange={(event) => setDraft({ ...draft, unique: event.target.checked })} />
                      {t('objects.fieldUnique')}
                    </label>
                  )}
                  {indexable(draft.type, fieldRenderers) ? (
                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <input type="checkbox" checked={draft.indexed} onChange={(event) => setDraft({ ...draft, indexed: event.target.checked })} />
                      {t('objects.fieldIndexed')}
                    </label>
                  ) : null}
                </div>

                {draft.type === 'ENUM' ? (
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label>{t('objects.enumOptions')}</Label>
                    <Input
                      value={draft.enumOptions}
                      onChange={(event) => setDraft({ ...draft, enumOptions: event.target.value })}
                      placeholder="RESIDENCIAL, COMERCIAL"
                      aria-label={t('objects.enumOptions')}
                    />
                  </div>
                ) : null}

                <ModuleFieldSettings
                  renderer={fieldRenderers[draft.type]}
                  settings={draft.settings}
                  onChange={(settings) => setDraft({ ...draft, settings })}
                />

                {draft.type === 'RELATION' ? (
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label>{t('objects.relationTarget')}</Label>
                    <Select value={draft.relationTarget} onValueChange={(value) => setDraft({ ...draft, relationTarget: value })}>
                      <SelectTrigger aria-label={t('objects.relationTarget')}>
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

                <div className="flex gap-2 sm:col-span-4">
                  <Button type="button" size="sm" onClick={submitField} disabled={addField.isPending || !draft.name.trim() || problem !== null}>
                    {t('common.create')}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setDraft(null)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-muted">{t('objects.addFieldHint')}</p>
            </CardBody>
          ) : null}

          <Table>
            <thead>
              <tr>
                <Th>{t('objects.fieldLabel')}</Th>
                <Th>{t('objects.fieldName')}</Th>
                <Th>{t('objects.fieldType')}</Th>
                <Th>{t('objects.fieldOptions')}</Th>
                <Th className="w-px" />
              </tr>
            </thead>
            {/* the platform's own columns: one row folded, so the object's own fields come first.
                a table may hold several tbody elements, which gives aria-controls one thing to name. */}
            <tbody>
              {systemFields.length ? (
                <tr>
                  <Td colSpan={5} className="py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-0"
                      aria-expanded={systemOpen}
                      aria-controls="system-fields"
                      onClick={() => setSystemOpen(!systemOpen)}
                    >
                      {systemOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {systemOpen ? t('objects.hideSystemFields') : t('objects.showSystemFields', { n: systemFields.length })}
                    </Button>
                  </Td>
                </tr>
              ) : null}
            </tbody>

            <tbody id="system-fields">
              {systemOpen
                ? systemFields.map((column) => (
                    <tr key={column.name} className="bg-surface-muted/40">
                      <Td />
                      <Td className="font-mono text-xs text-ink-muted">{column.name}</Td>
                      <Td>
                        {column.type ? (
                          <Badge className="bg-ink-muted/15 text-ink-muted">{column.type}</Badge>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </Td>
                      <Td className="text-xs text-ink-muted">{t(`objects.scope${scopeOf(column, flags.workflow === true)}`)}</Td>
                      <Td />
                    </tr>
                  ))
                : null}

              {systemOpen ? (
                <tr className="bg-surface-muted/40">
                  <Td colSpan={5} className="border-b-2 border-border py-2 text-xs text-ink-muted">
                    {t('objects.systemFieldsHint')}
                  </Td>
                </tr>
              ) : null}
            </tbody>

            <tbody>
              {definition.fields.map((field) => {
                // a relationship owns the column it created; the server refuses to drop it here
                const owner = relationshipOfField(relationships, object, field.name)
                return (
                  <tr key={field.id} className="hover:bg-surface-muted">
                    <Td>
                      {/* on blur, not on change: one PUT per keystroke would be a PUT per keystroke */}
                      <Input
                        key={field.label}
                        defaultValue={field.label}
                        aria-label={`${t('objects.fieldLabel')} ${field.name}`}
                        onBlur={(event) => {
                          const next = event.target.value.trim()
                          if (next && next !== field.label) void run(() => updateField.mutateAsync({ field: field.name, payload: { label: next } }))
                        }}
                      />
                    </Td>
                    <Td className="font-mono text-xs text-ink-muted">{field.name}</Td>
                    <Td>
                      <Badge>{field.type}</Badge>
                      {field.relationTarget ? <span className="ml-2 text-xs text-ink-muted">→ {field.relationTarget}</span> : null}
                      {owner ? <Badge className="ml-2 bg-ink-muted/15 text-ink-muted">{owner.name}</Badge> : null}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-3">
                        {(
                          [
                            ['required', t('objects.fieldRequired')],
                            // some module types mean nothing as unique, and the server refuses them
                            ...(fieldRenderers[field.type]?.uniqueAllowed === false ? [] : [['unique', t('objects.fieldUnique')] as const]),
                            ['visible', t('objects.fieldVisible')],
                            ['editable', t('objects.fieldEditable')],
                            // the server refuses an index on long text and on what a module keeps out of filters
                            ...(indexable(field.type, fieldRenderers) ? [['indexed', t('objects.fieldIndexed')] as const] : [])
                          ] as const
                        ).map(([flag, text]) => (
                          <label key={flag} className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <input
                              type="checkbox"
                              // indexed is omitted unless true
                              checked={field[flag] === true}
                              aria-label={`${text} ${field.name}`}
                              onChange={(event) => void run(() => updateField.mutateAsync({ field: field.name, payload: { [flag]: event.target.checked } }))}
                            />
                            {text}
                          </label>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={owner !== null}
                        title={owner ? t('relationships.belongsTo', { name: owner.name }) : undefined}
                        aria-label={`${t('objects.deleteField')} ${field.name}`}
                        onClick={() => removeField(field)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>

        <ObjectFieldSets
          fields={definition.fields}
          indexes={details.indexes}
          uniqueConstraints={details.uniqueConstraints}
          renderers={fieldRenderers}
          onChange={(kind, sets) => edit({ [kind]: sets })}
          onSave={saveDetails}
          saving={updateObject.isPending}
        />

        <ObjectRelationships objectName={object} />

        <ObjectActions objectName={object} />

        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle className="text-danger">{t('objects.dangerZone')}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-ink-muted">{t('objects.deleteWarning')}</p>
            <p className="text-sm text-ink-muted">{t('objects.preferDisable')}</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t('objects.deleteConfirmHint', { name: definition.name })}</Label>
                <Input
                  id="confirm"
                  value={confirmName}
                  onChange={(event) => setConfirmName(event.target.value)}
                  className="font-mono"
                  placeholder={definition.name}
                />
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={confirmName !== definition.name || deleteObject.isPending}
                onClick={removeObject}
                className="mb-0.5"
              >
                <Trash2 className="h-4 w-4" />
                {t('objects.deleteObject')}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  )
}

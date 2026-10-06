import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { ApiError } from '@wasichai/core'
import { useObjectDefinition, useObjects } from '@wasichai/core'
import { cn } from '@wasichai/ui'
import { useAutomationRuns, useAutomations, useDeleteAutomation, useDocumentTypeOptions, useSaveAutomation, useWorkflowOutline } from './api'
import { emptyAction, operatorNeedsValue, starterAutomation, triggerNeedsState, triggerNeedsTransition, validateAutomation } from './automationDraft'
import { RunTable } from './RunTable'
import type { ActionType, AutomationAction, AutomationCondition, AutomationPayload, ConditionOperator, TriggerType } from './types'

const TRIGGERS: TriggerType[] = ['RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED', 'TRANSITION_APPLIED', 'STATE_ENTERED']
const OPERATORS: ConditionOperator[] = ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'IS_EMPTY', 'IS_NOT_EMPTY', 'CHANGED']
const ACTIONS: ActionType[] = ['UPDATE_FIELD', 'CREATE_RECORD', 'WEBHOOK', 'GENERATE_DOCUMENT']
const STATE_FIELD = 'state'
// radix selects refuse an empty value, so "no filter" needs a sentinel
const ANY = '__any__'
const CHECKBOX = 'h-4 w-4 accent-brand'

// form-based rule editor: one trigger, some conditions, some actions. no canvas, on purpose.
export function AutomationBuilderPage() {
  const { t } = useTranslation(['automation', 'common'])
  const { data: objects = [] } = useObjects()
  const [objectName, setObjectName] = useState('')
  const { data: definition } = useObjectDefinition(objectName || undefined)
  const { data: automations = [] } = useAutomations(objectName || undefined)
  const { data: documentTypes = [] } = useDocumentTypeOptions(objectName || undefined)
  // an object without a workflow answers 404: the state and transition pickers just stay empty
  const workflow = useWorkflowOutline(objectName || undefined)
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<AutomationPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<{ field: string; message: string }[]>([])
  const save = useSaveAutomation()
  const remove = useDeleteAutomation()
  const runs = useAutomationRuns(objectName || undefined, selected ?? undefined)

  useEffect(() => {
    setSelected(null)
    setDraft(null)
    setError(null)
    setViolations([])
  }, [objectName])

  const fields = definition?.fields ?? []
  const states = workflow.data?.definition.states ?? []
  const transitions = workflow.data?.definition.transitions ?? []
  const problems = draft ? validateAutomation(draft) : []

  const edit = (name: string) => {
    const stored = automations.find((automation) => automation.name === name)
    if (!stored) return
    setSelected(stored.name)
    setDraft({ name: stored.name, label: stored.label, enabled: stored.enabled, definition: stored.definition })
    setError(null)
    setViolations([])
  }

  const startNew = () => {
    setSelected(null)
    setDraft(starterAutomation(t('automations.starterLabel')))
    setError(null)
    setViolations([])
  }

  const patchAction = (index: number, patch: Partial<AutomationAction>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            definition: {
              ...current.definition,
              actions: current.definition.actions.map((action, position) => (position === index ? { ...action, ...patch } : action))
            }
          }
        : current
    )

  const patchCondition = (index: number, patch: Partial<AutomationCondition>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            definition: {
              ...current.definition,
              conditions: current.definition.conditions.map((condition, position) => (position === index ? { ...condition, ...patch } : condition))
            }
          }
        : current
    )

  const submit = async () => {
    if (!draft || problems.length > 0) return
    setError(null)
    setViolations([])
    try {
      const saved = await save.mutateAsync({ objectName, name: selected ?? undefined, payload: draft })
      setSelected(saved.name)
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message)
        setViolations(cause.violations)
      } else {
        setError(String(cause))
      }
    }
  }

  const destroy = async () => {
    if (!selected) return
    if (!window.confirm(t('automations.confirmDelete', { name: selected }))) return
    try {
      await remove.mutateAsync({ objectName, name: selected })
      setSelected(null)
      setDraft(null)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : String(cause))
    }
  }

  return (
    <>
      <PageHeader title={t('automations.title')} subtitle={t('automations.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardBody>
            <div className="max-w-sm space-y-1.5">
              <Label>{t('automations.object')}</Label>
              <Select value={objectName} onValueChange={setObjectName}>
                <SelectTrigger>
                  <SelectValue placeholder={t('automations.selectObject')} />
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
          </CardBody>
        </Card>

        {!objectName ? null : (
          <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>{t('automations.rules')}</CardTitle>
                <Button variant="ghost" onClick={startNew}>
                  <Plus className="h-4 w-4" />
                  {t('automations.newRule')}
                </Button>
              </CardHeader>
              <CardBody className="space-y-1">
                {automations.length === 0 ? <p className="text-sm text-ink-muted">{t('automations.noRules')}</p> : null}
                {automations.map((automation) => (
                  <button
                    key={automation.id}
                    type="button"
                    onClick={() => edit(automation.name)}
                    className={cn(
                      'flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm',
                      selected === automation.name ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-surface-muted'
                    )}
                  >
                    <span className="font-medium">{automation.label || automation.name}</span>
                    <span className="text-xs text-ink-muted">
                      {t(`automations.triggers.${automation.definition.trigger.type}`)}
                      {automation.enabled ? '' : ` · ${t('automations.enabled')}: ✕`}
                    </span>
                  </button>
                ))}
              </CardBody>
            </Card>

            {!draft ? null : (
              <div className="space-y-5">
                <Card>
                  <CardHeader className="flex items-center justify-between gap-3">
                    <CardTitle>{draft.label || draft.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {selected ? (
                        <Button variant="danger" onClick={() => void destroy()} disabled={remove.isPending}>
                          <Trash2 className="h-4 w-4" />
                          {t('automations.delete')}
                        </Button>
                      ) : null}
                      <Button onClick={() => void submit()} disabled={save.isPending || problems.length > 0}>
                        {t('automations.save')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {!selected ? <p className="text-sm text-ink-muted">{t('automations.newHint')}</p> : null}
                    {error ? (
                      <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                        {error}
                      </p>
                    ) : null}
                    {violations.length > 0 ? (
                      <ul className="space-y-1 text-sm text-danger">
                        {violations.map((violation) => (
                          <li key={`${violation.field}-${violation.message}`}>
                            {violation.field}: {violation.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {problems.length > 0 ? (
                      <ul data-testid="automation-problems" className="space-y-1 text-sm text-danger">
                        {problems.map((problem, index) => (
                          <li key={`${problem.code}-${problem.value ?? index}`}>{t(`automations.problems.${problem.code}`, { value: problem.value })}</li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="automation-name">{t('automations.name')}</Label>
                        <Input id="automation-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="automation-label">{t('automations.label')}</Label>
                        <Input id="automation-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('automations.enabled')}</Label>
                        <label className="flex h-9 items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            className={CHECKBOX}
                            checked={draft.enabled}
                            onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
                          />
                          {t('automations.enabledHint')}
                        </label>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('automations.trigger')}</CardTitle>
                  </CardHeader>
                  <CardBody className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="automation-trigger">{t('automations.trigger')}</Label>
                      <Select
                        value={draft.definition.trigger.type}
                        onValueChange={(type) => setDraft({ ...draft, definition: { ...draft.definition, trigger: { type: type as TriggerType } } })}
                      >
                        <SelectTrigger id="automation-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGERS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`automations.triggers.${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {triggerNeedsState(draft.definition.trigger.type) ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="automation-state">{t('automations.triggerState')}</Label>
                        <Select
                          value={draft.definition.trigger.state ?? ''}
                          onValueChange={(state) =>
                            setDraft({ ...draft, definition: { ...draft.definition, trigger: { ...draft.definition.trigger, state } } })
                          }
                        >
                          <SelectTrigger id="automation-state">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.name} value={state.name}>
                                {state.label || state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    {triggerNeedsTransition(draft.definition.trigger.type) ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="automation-transition">{t('automations.triggerTransition')}</Label>
                        <Select
                          value={draft.definition.trigger.transition ?? ANY}
                          onValueChange={(transition) =>
                            setDraft({
                              ...draft,
                              definition: {
                                ...draft.definition,
                                trigger: { ...draft.definition.trigger, transition: transition === ANY ? null : transition }
                              }
                            })
                          }
                        >
                          <SelectTrigger id="automation-transition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ANY}>{t('automations.anyTransition')}</SelectItem>
                            {transitions.map((transition) => (
                              <SelectItem key={transition.name} value={transition.name}>
                                {transition.label || transition.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader className="flex items-center justify-between gap-3">
                    <CardTitle>{t('automations.conditions')}</CardTitle>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          definition: {
                            ...draft.definition,
                            conditions: [...draft.definition.conditions, { field: fields[0]?.name ?? STATE_FIELD, operator: 'EQUALS', value: '' }]
                          }
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      {t('automations.addCondition')}
                    </Button>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    {draft.definition.conditions.length === 0 ? <p className="text-sm text-ink-muted">{t('automations.noConditions')}</p> : null}
                    {draft.definition.conditions.map((condition, index) => (
                      <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                        <div className="space-y-1.5">
                          <Label>{t('automations.field')}</Label>
                          <Select value={condition.field} onValueChange={(field) => patchCondition(index, { field })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={STATE_FIELD}>{t('automations.stateField')}</SelectItem>
                              {fields.map((field) => (
                                <SelectItem key={field.id} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t('automations.operator')}</Label>
                          <Select value={condition.operator} onValueChange={(operator) => patchCondition(index, { operator: operator as ConditionOperator })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map((operator) => (
                                <SelectItem key={operator} value={operator}>
                                  {t(`automations.operators.${operator}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t('automations.value')}</Label>
                          <Input
                            value={condition.value ?? ''}
                            disabled={!operatorNeedsValue(condition.operator)}
                            onChange={(event) => patchCondition(index, { value: event.target.value })}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              definition: {
                                ...draft.definition,
                                conditions: draft.definition.conditions.filter((_, position) => position !== index)
                              }
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader className="flex items-center justify-between gap-3">
                    <CardTitle>{t('automations.actions')}</CardTitle>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          definition: { ...draft.definition, actions: [...draft.definition.actions, emptyAction('UPDATE_FIELD')] }
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      {t('automations.addAction')}
                    </Button>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <p className="text-xs text-ink-muted">{t('automations.templateHint')}</p>
                    {draft.definition.actions.map((action, index) => (
                      <div key={index} className="space-y-3 rounded-md border border-border p-4">
                        <div className="flex items-end gap-3">
                          <div className="w-56 space-y-1.5">
                            <Label>{t('automations.actionType')}</Label>
                            <Select value={action.type} onValueChange={(type) => patchAction(index, emptyAction(type as ActionType))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTIONS.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {t(`automations.actionTypes.${type}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                definition: { ...draft.definition, actions: draft.definition.actions.filter((_, position) => position !== index) }
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {action.type === 'UPDATE_FIELD' ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>{t('automations.field')}</Label>
                              <Select value={action.field ?? ''} onValueChange={(field) => patchAction(index, { field })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fields
                                    .filter((field) => field.editable)
                                    .map((field) => (
                                      <SelectItem key={field.id} value={field.name}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>{t('automations.value')}</Label>
                              <Input value={action.value ?? ''} onChange={(event) => patchAction(index, { value: event.target.value })} />
                            </div>
                          </div>
                        ) : null}

                        {action.type === 'CREATE_RECORD' ? (
                          <div className="space-y-3">
                            <div className="max-w-sm space-y-1.5">
                              <Label>{t('automations.targetObject')}</Label>
                              <Select value={action.targetObject ?? ''} onValueChange={(targetObject) => patchAction(index, { targetObject })}>
                                <SelectTrigger>
                                  <SelectValue />
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
                            <ValueRows
                              values={action.values ?? {}}
                              onChange={(values) => patchAction(index, { values })}
                              keyLabel={t('automations.valueKey')}
                              valueLabel={t('automations.value')}
                              addLabel={t('automations.addValue')}
                            />
                          </div>
                        ) : null}

                        {action.type === 'WEBHOOK' ? (
                          <div className="space-y-1.5">
                            <Label>{t('automations.url')}</Label>
                            <Input value={action.url ?? ''} onChange={(event) => patchAction(index, { url: event.target.value })} />
                            <p className="text-xs text-ink-muted">{t('automations.urlHint')}</p>
                          </div>
                        ) : null}

                        {action.type === 'GENERATE_DOCUMENT' ? (
                          <div className="max-w-sm space-y-1.5">
                            <Label>{t('automations.documentType')}</Label>
                            <Select value={action.documentType ?? ''} onValueChange={(documentType) => patchAction(index, { documentType })}>
                              <SelectTrigger>
                                <SelectValue placeholder={t('automations.selectDocumentType')} />
                              </SelectTrigger>
                              <SelectContent>
                                {documentTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.name}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {documentTypes.length === 0 ? <p className="text-xs text-ink-muted">{t('automations.noDocumentTypes')}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </CardBody>
                </Card>

                {selected ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('automations.runs')}</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <RunTable runs={runs.data ?? []} />
                    </CardBody>
                  </Card>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// create-record values are free key/value pairs: the server checks the names against the target
function ValueRows({
  values,
  onChange,
  keyLabel,
  valueLabel,
  addLabel
}: {
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  keyLabel: string
  valueLabel: string
  addLabel: string
}) {
  const entries = Object.entries(values)
  return (
    <div className="space-y-2">
      {entries.map(([key, value], index) => (
        <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label>{keyLabel}</Label>
            <Input
              value={key}
              onChange={(event) => {
                const next = entries.map((entry, position) => (position === index ? [event.target.value, entry[1]] : entry))
                onChange(Object.fromEntries(next))
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{valueLabel}</Label>
            <Input
              value={value}
              onChange={(event) => {
                const next = entries.map((entry, position) => (position === index ? [entry[0], event.target.value] : entry))
                onChange(Object.fromEntries(next))
              }}
            />
          </div>
          <Button variant="ghost" onClick={() => onChange(Object.fromEntries(entries.filter((_, position) => position !== index)))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange({ ...values, '': '' })}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}

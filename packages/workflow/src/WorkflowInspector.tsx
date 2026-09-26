import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useRoles } from '@wasichai/core'
import type { StateType, WorkflowPayload, WorkflowState, WorkflowTransition } from './types'

const STATE_TYPES: StateType[] = ['INITIAL', 'INTERMEDIATE', 'FINAL']
const CHECKBOX = 'h-4 w-4 accent-brand'

export type Selection = { kind: 'state'; name: string } | { kind: 'transition'; name: string } | null

interface Props {
  draft: WorkflowPayload
  selection: Selection
  onWorkflow: (patch: Partial<WorkflowPayload>) => void
  onState: (name: string, patch: Partial<WorkflowState>) => void
  onTransition: (name: string, patch: Partial<WorkflowTransition>) => void
  onDelete: () => void
}

// the right-hand panel: whatever the canvas has selected, in fields you can edit.
export function WorkflowInspector({ draft, selection, onWorkflow, onState, onTransition, onDelete }: Props) {
  const { t } = useTranslation(['workflow', 'common'])
  const state = selection?.kind === 'state' ? draft.definition.states.find((item) => item.name === selection.name) : undefined
  const transition = selection?.kind === 'transition' ? draft.definition.transitions.find((item) => item.name === selection.name) : undefined

  return (
    <Card className="lg:sticky lg:top-8">
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>{state ? t('workflows.stateSelected') : transition ? t('workflows.transitionSelected') : t('workflows.inspector')}</CardTitle>
        {state || transition ? (
          <Button variant="ghost" size="icon" aria-label={t('workflows.deleteSelected')} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-4">
        {state ? (
          <StateFields state={state} onPatch={(patch) => onState(state.name, patch)} />
        ) : transition ? (
          <TransitionFields transition={transition} states={draft.definition.states} onPatch={(patch) => onTransition(transition.name, patch)} />
        ) : (
          <WorkflowFields draft={draft} onPatch={onWorkflow} />
        )}
      </CardBody>
    </Card>
  )
}

// nothing selected: the workflow's own settings, and how to work the canvas
function WorkflowFields({ draft, onPatch }: { draft: WorkflowPayload; onPatch: (patch: Partial<WorkflowPayload>) => void }) {
  const { t } = useTranslation(['workflow', 'common'])
  return (
    <>
      <p className="text-sm text-ink-muted">{t('workflows.selectHint')}</p>
      <div className="space-y-1.5">
        <Label htmlFor="workflow-name">{t('workflows.name')}</Label>
        <Input id="workflow-name" value={draft.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="workflow-label">{t('workflows.label')}</Label>
        <Input id="workflow-label" value={draft.label} onChange={(event) => onPatch({ label: event.target.value })} />
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className={CHECKBOX} checked={draft.enabled} onChange={(event) => onPatch({ enabled: event.target.checked })} />
          {t('workflows.enabled')}
        </label>
        <p className="text-xs text-ink-muted">{t('workflows.enabledHint')}</p>
      </div>
    </>
  )
}

function StateFields({ state, onPatch }: { state: WorkflowState; onPatch: (patch: Partial<WorkflowState>) => void }) {
  const { t } = useTranslation(['workflow', 'common'])
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="state-name">{t('workflows.stateName')}</Label>
        <Input id="state-name" value={state.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="state-label">{t('workflows.stateLabel')}</Label>
        <Input id="state-label" value={state.label} onChange={(event) => onPatch({ label: event.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{t('workflows.stateType')}</Label>
        <Select value={state.type} onValueChange={(value) => onPatch({ type: value as StateType })}>
          <SelectTrigger aria-label={t('workflows.stateType')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`workflows.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.type === 'FINAL' ? <p className="text-xs text-ink-muted">{t('workflows.finalHint')}</p> : null}
      </div>
    </>
  )
}

function TransitionFields({
  transition,
  states,
  onPatch
}: {
  transition: WorkflowTransition
  states: WorkflowState[]
  onPatch: (patch: Partial<WorkflowTransition>) => void
}) {
  const { t } = useTranslation(['workflow', 'common'])
  const { data: roles = [] } = useRoles()
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="transition-name">{t('workflows.name')}</Label>
        <Input id="transition-name" value={transition.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transition-label">{t('workflows.label')}</Label>
        <Input id="transition-label" value={transition.label} onChange={(event) => onPatch({ label: event.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('workflows.from')}</Label>
          <StateSelect states={states} value={transition.from} label={t('workflows.from')} onChange={(value) => onPatch({ from: value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('workflows.to')}</Label>
          <StateSelect states={states} value={transition.to} label={t('workflows.to')} onChange={(value) => onPatch({ to: value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t('workflows.roles')}</Label>
        <div className="flex flex-wrap items-center gap-3">
          {roles.length === 0 ? <span className="text-sm text-ink-muted">{t('workflows.anyRole')}</span> : null}
          {roles.map((role) => (
            <label key={role.name} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={transition.roles.includes(role.name)}
                onChange={() => onPatch({ roles: toggle(transition.roles, role.name) })}
              />
              {role.label || role.name}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-muted">{t('workflows.rolesHint')}</p>
      </div>
    </>
  )
}

// radix rejects an empty value, and a half-typed state name is not worth offering
function StateSelect({ states, value, label, onChange }: { states: WorkflowState[]; value: string; label: string; onChange: (value: string) => void }) {
  const { t } = useTranslation(['workflow', 'common'])
  const named = states.filter((state) => state.name)
  return (
    <Select value={named.some((state) => state.name === value) ? value : ''} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={t('workflows.selectState')} />
      </SelectTrigger>
      <SelectContent>
        {named.map((state) => (
          <SelectItem key={state.name} value={state.name}>
            {state.label || state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

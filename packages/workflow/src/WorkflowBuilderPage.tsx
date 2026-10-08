import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { Card, CardBody } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { ApiError, ErrorState } from '@wasichai/core'
import { useObjects } from '@wasichai/core'
import { useDeleteWorkflow, useSaveWorkflow, useWorkflow } from './api'
import { WorkflowCanvas } from './WorkflowCanvas'
import { WorkflowInspector } from './WorkflowInspector'
import type { Selection } from './WorkflowInspector'
import { layoutStates, refuseConnection, starterDefinition, uniqueName, validateDefinition, withPositions } from './workflowGraph'
import type { XY } from './workflowGraph'
import type { DefinitionProblem, WorkflowPayload, WorkflowState, WorkflowTransition } from './types'

// the graph is the editor: drag the states, drag between them to connect, and the panel
// on the right edits whatever is selected.
export function WorkflowBuilderPage() {
  const { t } = useTranslation(['workflow', 'common'])
  const { data: objects = [] } = useObjects()
  const [objectName, setObjectName] = useState('')
  const workflow = useWorkflow(objectName || undefined)
  const save = useSaveWorkflow()
  const remove = useDeleteWorkflow()
  const [draft, setDraft] = useState<WorkflowPayload | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<{ field: string; message: string }[]>([])
  const [refusal, setRefusal] = useState<string | null>(null)

  // react-query keeps the last good data after an error, so a fresh 404 (deleted just now)
  // would still look like a stored workflow. the error wins.
  // only a 404 means "none yet": a starter after a 500 would let Save overwrite the stored one
  const missing = workflow.error instanceof ApiError && workflow.error.status === 404
  const failed = workflow.isError && !missing
  const stored = workflow.isError ? undefined : workflow.data
  // the server is the source of truth. no workflow yet? hand out something worth editing.
  useEffect(() => {
    if (!objectName) {
      setDraft(null)
      return
    }
    if (missing) {
      setDraft({
        name: 'approval',
        label: t('workflows.starter.workflowLabel'),
        enabled: true,
        definition: starterDefinition({
          draft: t('workflows.starter.draft'),
          review: t('workflows.starter.review'),
          approved: t('workflows.starter.approved'),
          rejected: t('workflows.starter.rejected'),
          send: t('workflows.starter.send'),
          approve: t('workflows.starter.approve'),
          reject: t('workflows.starter.reject')
        })
      })
    } else if (stored) {
      setDraft({ name: stored.name, label: stored.label, enabled: stored.enabled, definition: stored.definition })
    } else {
      // loading or failed: the draft of the last object must not be saved over this one
      setDraft(null)
    }
    setSelection(null)
    setError(null)
    setViolations([])
    setRefusal(null)
  }, [objectName, stored, missing, t])

  // a state without coordinates is placed, never left on top of the origin
  const positions = useMemo<Record<string, XY>>(() => (draft ? layoutStates(draft.definition) : {}), [draft])

  const patchDefinition = (
    patch: (states: WorkflowState[], transitions: WorkflowTransition[]) => { states: WorkflowState[]; transitions: WorkflowTransition[] }
  ) => setDraft((current) => (current ? { ...current, definition: patch(current.definition.states, current.definition.transitions) } : current))

  const patchState = (name: string, patch: Partial<WorkflowState>) => {
    // an empty name is still a rename: the selection has to follow it or the next
    // keystroke lands on a state nobody is pointing at any more.
    const renamedTo = patch.name !== undefined && patch.name !== name ? patch.name : undefined
    if (renamedTo !== undefined) setSelection({ kind: 'state', name: renamedTo })
    patchDefinition((states, transitions) => {
      const next = states.map((state) => (state.name === name ? { ...state, ...patch } : state))
      // exactly one initial state: picking it here takes it away from everybody else
      if (patch.type === 'INITIAL') {
        next.forEach((state, position) => {
          if (state.name !== name && state.type === 'INITIAL') next[position] = { ...state, type: 'INTERMEDIATE' }
        })
      }
      // a rename drags its transitions along, otherwise the graph breaks silently
      const renamed =
        renamedTo !== undefined
          ? transitions.map((transition) => ({
              ...transition,
              from: transition.from === name ? renamedTo : transition.from,
              to: transition.to === name ? renamedTo : transition.to
            }))
          : transitions
      return { states: next, transitions: renamed }
    })
  }

  const patchTransition = (name: string, patch: Partial<WorkflowTransition>) => {
    // same as a state: the selection follows a rename, or the inspector loses it after one keystroke
    if (patch.name !== undefined && patch.name !== name) setSelection({ kind: 'transition', name: patch.name })
    patchDefinition((states, transitions) => ({
      states,
      transitions: transitions.map((transition) => (transition.name === name ? { ...transition, ...patch } : transition))
    }))
  }

  const moveState = (name: string, at: XY) => patchState(name, { x: Math.round(at.x), y: Math.round(at.y) })

  const addState = () => {
    if (!draft) return
    const states = draft.definition.states
    const name = uniqueName(
      'state',
      states.map((state) => state.name)
    )
    setSelection({ kind: 'state', name })
    patchDefinition((current, transitions) => ({
      states: [
        ...current,
        {
          name,
          label: '',
          // the first state of an empty workflow has to be the initial one
          type: current.some((state) => state.type === 'INITIAL') ? 'INTERMEDIATE' : 'INITIAL',
          // beside the rightmost one, not on top of it. the admin moves it from there.
          x: Math.round(Math.max(40, ...current.map((state) => state.x ?? 40)) + 260),
          y: 40
        }
      ],
      transitions
    }))
  }

  const connect = (from: string, to: string) => {
    if (!draft) return
    const refused = refuseConnection(draft.definition, from, to)
    if (refused) {
      setRefusal(t(`workflows.refusals.${refused.code}`, { value: refused.value }))
      return
    }
    setRefusal(null)
    const name = uniqueName(
      'transition',
      draft.definition.transitions.map((transition) => transition.name)
    )
    setSelection({ kind: 'transition', name })
    patchDefinition((states, transitions) => ({ states, transitions: [...transitions, { name, label: '', from, to, roles: [] }] }))
  }

  const dropSelected = () => {
    if (!selection) return
    const gone = selection.name
    setSelection(null)
    if (selection.kind === 'transition') {
      patchDefinition((states, transitions) => ({ states, transitions: transitions.filter((item) => item.name !== gone) }))
      return
    }
    patchDefinition((states, transitions) => ({
      states: states.filter((state) => state.name !== gone),
      // transitions touching the gone state would be dangling. drop them with it.
      transitions: transitions.filter((transition) => transition.from !== gone && transition.to !== gone)
    }))
  }

  // after adding a few states by hand the picture drifts; this puts it back in order
  const relayout = () =>
    setDraft((current) => {
      if (!current) return current
      const bare = { ...current.definition, states: current.definition.states.map(({ x: _x, y: _y, ...rest }) => rest) }
      return { ...current, definition: withPositions(bare, layoutStates(bare)) }
    })

  const problems: DefinitionProblem[] = draft ? validateDefinition(draft.definition) : []

  const submit = async () => {
    if (!draft || problems.length > 0) return
    setError(null)
    setViolations([])
    try {
      // whatever the layout resolved is what gets stored, placed by hand or not
      await save.mutateAsync({ objectName, payload: { ...draft, definition: withPositions(draft.definition, positions) } })
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
    if (!stored) return
    if (!window.confirm(t('workflows.confirmDelete', { object: objectName }))) return
    setError(null)
    setViolations([])
    try {
      await remove.mutateAsync(objectName)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : String(cause))
    }
  }

  return (
    <>
      <PageHeader title={t('workflows.title')} subtitle={t('workflows.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardBody className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-full max-w-sm space-y-1.5">
              <Label>{t('workflows.object')}</Label>
              <Select value={objectName} onValueChange={setObjectName}>
                <SelectTrigger aria-label={t('workflows.object')}>
                  <SelectValue placeholder={t('workflows.selectObject')} />
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
            {draft ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={addState}>
                  <Plus className="h-4 w-4" />
                  {t('workflows.addState')}
                </Button>
                <Button variant="secondary" size="sm" onClick={relayout}>
                  <LayoutGrid className="h-4 w-4" />
                  {t('workflows.autoLayout')}
                </Button>
                {stored ? (
                  <Button variant="danger" size="sm" onClick={() => void destroy()} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4" />
                    {t('workflows.delete')}
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => void submit()} disabled={save.isPending || problems.length > 0}>
                  {t('workflows.save')}
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {!objectName ? null : failed ? (
          <ErrorState error={workflow.error} onRetry={() => void workflow.refetch()} />
        ) : workflow.isLoading || !draft ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : (
          <>
            {!stored ? <p className="text-sm text-ink-muted">{t('workflows.newHint')}</p> : null}
            {error ? (
              <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {refusal ? (
              <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                {refusal}
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
              <ul data-testid="workflow-problems" className="space-y-1 text-sm text-danger">
                {problems.map((problem, index) => (
                  <li key={`${problem.code}-${problem.value ?? index}`}>{t(`workflows.problems.${problem.code}`, { value: problem.value })}</li>
                ))}
              </ul>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
              <Card className="h-[32rem] overflow-hidden" data-testid="workflow-canvas">
                <WorkflowCanvas
                  definition={draft.definition}
                  positions={positions}
                  selected={selection?.name ?? null}
                  onSelectState={(name) => setSelection({ kind: 'state', name })}
                  onSelectTransition={(name) => setSelection({ kind: 'transition', name })}
                  onMove={moveState}
                  onConnect={connect}
                />
              </Card>

              <WorkflowInspector
                draft={draft}
                selection={selection}
                onWorkflow={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
                onState={patchState}
                onTransition={patchTransition}
                onDelete={dropSelected}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}

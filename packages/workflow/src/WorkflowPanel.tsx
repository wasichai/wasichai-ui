import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Badge } from '@wasichai/ui'
import { ApiError } from '@wasichai/core'
import { useRecord } from '@wasichai/core'
import { cn } from '@wasichai/ui'
import { useApplyTransition, useAvailableTransitions, useWorkflow } from './api'
import { findState, stateLabel, stateTone } from './workflowGraph'
import type { RecordWithState } from './types'

interface WorkflowPanelProps {
  objectName: string
  recordId: string
}

// the workflow of one record: where it is and where it can go. an object without a workflow
// draws nothing at all, so a component left on a page never leaves an empty box.
export function WorkflowPanel({ objectName, recordId }: WorkflowPanelProps) {
  const { t } = useTranslation(['workflow', 'common'])
  const workflow = useWorkflow(objectName)
  const transitions = useAvailableTransitions(objectName, recordId)
  // already in cache: the detail page fetched it. here only for `state`.
  const record = useRecord(objectName, recordId)
  const apply = useApplyTransition(objectName, recordId)

  // no workflow, endpoint missing, or switched off: nothing to draw
  if (!workflow.data || !workflow.data.enabled) return null

  const states = workflow.data.definition.states
  const current = (record.data as RecordWithState | undefined)?.state ?? null
  const available = transitions.data ?? []
  const error = describeError(apply.error, t('workflows.conflict'))

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>{workflow.data.label || t('workflows.panelTitle')}</CardTitle>
        <Badge data-testid="workflow-state" className={cn('px-3 py-1 text-sm', stateTone(findState(states, current)?.type))}>
          {stateLabel(states, current, t('workflows.unknownState'))}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        {error ? <p className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">{error}</p> : null}

        {available.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('workflows.noTransitions')}</p>
        ) : (
          <div className="space-y-3">
            {available.map((transition) => (
              <div key={transition.name} className="space-y-1">
                <Button
                  variant={transition.allowed ? 'primary' : 'secondary'}
                  disabled={!transition.allowed || apply.isPending}
                  // a blocked transition still says where it would go and why it is blocked
                  title={transition.allowed ? t('workflows.moveTo', { state: transition.toLabel }) : (transition.reason ?? t('workflows.notAllowed'))}
                  onClick={() => apply.mutate(transition.name)}
                >
                  {transition.label}
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-xs opacity-80">{transition.toLabel}</span>
                </Button>
                {!transition.allowed ? <p className="text-xs text-ink-muted">{transition.reason ?? t('workflows.notAllowed')}</p> : null}
              </div>
            ))}
            {apply.isPending ? <p className="text-sm text-ink-muted">{t('workflows.applying')}</p> : null}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// 409 means somebody moved the record first. prefer what the server says over our own wording.
function describeError(cause: unknown, conflict: string): string | null {
  if (!cause) return null
  if (cause instanceof ApiError) {
    return cause.message || (cause.status === 409 ? conflict : String(cause.status))
  }
  return String(cause)
}

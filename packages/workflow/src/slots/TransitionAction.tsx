import { useTranslation } from 'react-i18next'
import { describeError, reasonRefusal, useReasonPrompt, useWritePolicy, type PageActionProps } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useApplyTransition, useAvailableTransitions } from '../api'

// the one transition an admin placed as a button. WORKFLOW draws every transition at once; this
// draws the one it was told to, and says why when that one is shut.
export function TransitionAction({ component, objectName, recordId }: PageActionProps) {
  const { t } = useTranslation(['workflow', 'common'])
  const transitions = useAvailableTransitions(objectName, recordId)
  const apply = useApplyTransition(objectName, recordId)
  const policy = useWritePolicy(objectName)
  const prompt = useReasonPrompt()
  const found = (transitions.data ?? []).find((candidate) => candidate.name === component.transition)
  const label = component.title ?? found?.label ?? component.transition ?? t('pages.action')
  // append-only refuses every move (409): say so instead of offering it
  const appendOnly = policy.loaded && !policy.canTransition
  // a refused reason is said in the open dialog, once
  const refused = prompt.dialog && reasonRefusal(apply.error) !== undefined ? null : apply.error

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant={component.style === 'PRIMARY' ? 'primary' : 'secondary'}
        // until the rules arrive a transition could skip the reason
        disabled={!found?.allowed || apply.isPending || !policy.loaded || appendOnly}
        // gone from the workflow says so; shut by the object's rules says that; blocked says why
        title={
          found ? (appendOnly ? t('common:writePolicy.record.appendOnly') : found.allowed ? undefined : (found.reason ?? undefined)) : t('pages.transitionGone')
        }
        onClick={() =>
          prompt.withReason((reason) => apply.mutateAsync({ name: component.transition!, reason }), {
            required: policy.requiresReason,
            title: label,
            confirmLabel: label
          })
        }
      >
        {label}
      </Button>
      {/* a refused transition used to say nothing here */}
      {refused ? (
        <p role="alert" className="text-xs text-danger">
          {describeError(refused)}
        </p>
      ) : null}
      {prompt.dialog}
    </span>
  )
}

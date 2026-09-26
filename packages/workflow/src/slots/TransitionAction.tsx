import { useTranslation } from 'react-i18next'
import type { PageActionProps } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useApplyTransition, useAvailableTransitions } from '../api'

// the one transition an admin placed as a button. WORKFLOW draws every transition at once; this
// draws the one it was told to, and says why when that one is shut.
export function TransitionAction({ component, objectName, recordId }: PageActionProps) {
  const { t } = useTranslation(['workflow', 'common'])
  const transitions = useAvailableTransitions(objectName, recordId)
  const apply = useApplyTransition(objectName, recordId)
  const found = (transitions.data ?? []).find((candidate) => candidate.name === component.transition)

  return (
    <Button
      variant={component.style === 'PRIMARY' ? 'primary' : 'secondary'}
      disabled={!found?.allowed || apply.isPending}
      // gone from the workflow says so; still there but blocked says why
      title={found ? (found.allowed ? undefined : (found.reason ?? undefined)) : t('pages.transitionGone')}
      onClick={() => apply.mutate(component.transition!)}
    >
      {component.title ?? found?.label ?? component.transition ?? t('pages.action')}
    </Button>
  )
}

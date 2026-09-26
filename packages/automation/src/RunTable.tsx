import { useTranslation } from 'react-i18next'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { cn } from '@wasichai/ui'
import { absoluteTime, relativeTime } from '@wasichai/core'
import { statusTone } from './automationDraft'
import type { AutomationRun } from './types'

const TONES = {
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  muted: 'bg-surface-muted text-ink-muted'
}

// the log. a skipped run carries its reason in the same column a failure would, because
// "nothing happened" and "it broke" are the two questions this table exists to answer.
export function RunTable({ runs, showRule = false }: { runs: AutomationRun[]; showRule?: boolean }) {
  const { t } = useTranslation(['automation', 'common'])

  if (runs.length === 0) return <p className="text-sm text-ink-muted">{t('automations.noRuns')}</p>

  return (
    <Table>
      <thead>
        <tr>
          <Th>{t('automations.status')}</Th>
          {showRule ? <Th>{t('automations.rules')}</Th> : null}
          <Th>{t('automations.triggerColumn')}</Th>
          <Th>{t('automations.when')}</Th>
          <Th>{t('automations.detail')}</Th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <Td>
              <Badge className={cn(TONES[statusTone(run.status)])}>{t(`automations.statuses.${run.status}`)}</Badge>
            </Td>
            {showRule ? (
              <Td>
                <span className="text-ink">{run.automation ?? '—'}</span>
                <span className="block text-xs text-ink-muted">{run.objectName}</span>
              </Td>
            ) : null}
            <Td className="text-ink-muted">{t(`automations.triggers.${run.trigger}`)}</Td>
            <Td title={run.createdAt ? absoluteTime(run.createdAt) : ''}>{run.createdAt ? relativeTime(run.createdAt) : '—'}</Td>
            <Td>
              {run.error ? <span className="text-danger">{run.error}</span> : null}
              {run.steps.map((step, index) => (
                <span key={index} className="block text-xs text-ink-muted">
                  {t(`automations.actionTypes.${step.action}`)}: {step.detail}
                </span>
              ))}
              {run.depth > 0 ? (
                <span className="block text-xs text-ink-muted">
                  {t('automations.depth')}: {run.depth}
                </span>
              ) : null}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

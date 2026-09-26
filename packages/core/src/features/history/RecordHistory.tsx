import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { useRegistry } from '../../app/context'
import type { ObjectDefinition } from '../../types/metadata'
import { useRecordHistory } from './api'
import { absoluteTime, describeChanges, relativeTime } from './changes'
import { ChangeList } from './ChangeList'
import { OperationBadge } from './OperationBadge'
import { useAuditExtensions } from './useAuditExtensions'

interface RecordHistoryProps {
  objectName: string
  recordId: string
  definition: ObjectDefinition
}

// one record's audit trail as a timeline. history is informative: it never breaks the detail page.
export function RecordHistory({ objectName, recordId, definition }: RecordHistoryProps) {
  const { t } = useTranslation()
  const { historyRenderers } = useRegistry()
  const extensions = useAuditExtensions()
  const history = useRecordHistory(objectName, recordId)
  const entries = [...(history.data ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardBody>
        {history.isLoading ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : history.isError ? (
          // endpoint missing or down. say it quietly, no error styling.
          <p className="text-sm text-ink-muted">{t('history.unavailable')}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('history.empty')}</p>
        ) : (
          <ol data-testid="history-timeline" className="space-y-4 border-l border-border pl-4">
            {entries.map((entry) => {
              // core draws an update's changes; any other operation is drawn by the module that owns it, if any
              const ModuleBody = entry.operation === 'UPDATE' ? undefined : historyRenderers[entry.operation]?.body
              return (
                <li key={entry.id} className="relative space-y-1.5">
                  <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-border" />
                  <div className="flex flex-wrap items-center gap-2">
                    <OperationBadge operation={entry.operation} />
                    <span className="text-sm text-ink">{entry.userEmail ?? t('history.system')}</span>
                    <time className="text-xs text-ink-muted" dateTime={entry.occurredAt} title={absoluteTime(entry.occurredAt)}>
                      {relativeTime(entry.occurredAt)}
                    </time>
                  </div>
                  {entry.operation === 'UPDATE' ? (
                    <ChangeList changes={describeChanges(entry, definition, extensions)} />
                  ) : ModuleBody ? (
                    <ModuleBody entry={entry} />
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  )
}

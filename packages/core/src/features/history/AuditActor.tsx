import { useTranslation } from 'react-i18next'
import { Badge } from '@wasichai/ui'
import type { AuditEntry } from '../../types/audit'

// who wrote it. a service account writes through a backing user whose address means nothing to a reader: name the account
export function AuditActor({ entry }: { entry: Pick<AuditEntry, 'userEmail' | 'serviceAccount'> }) {
  const { t } = useTranslation()
  if (entry.serviceAccount) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-sm text-ink">{entry.serviceAccount}</span>
        <Badge className="bg-surface-muted text-ink-muted">{t('history.serviceAccount')}</Badge>
      </span>
    )
  }
  return <span className="text-sm text-ink">{entry.userEmail ?? t('history.system')}</span>
}

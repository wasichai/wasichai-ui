import { useTranslation } from 'react-i18next'
import { MoveRight } from 'lucide-react'
import type { ChangeDescription } from '../../types/audit'

// `label: before → after`, one line per field that really moved.
export function ChangeList({ changes }: { changes: ChangeDescription[] }) {
  const { t } = useTranslation()

  if (changes.length === 0) {
    return <p className="text-xs text-ink-muted">{t('history.noChanges')}</p>
  }

  return (
    <ul className="space-y-1">
      {changes.map((change) => (
        <li key={change.field} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-ink">{change.label}</span>
          <span className="text-ink-muted line-through decoration-ink-muted/40">{change.before}</span>
          <MoveRight className="h-3 w-3 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="text-ink">{change.after}</span>
        </li>
      ))}
    </ul>
  )
}

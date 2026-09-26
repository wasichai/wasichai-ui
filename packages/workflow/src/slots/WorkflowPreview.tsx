import { useTranslation } from 'react-i18next'

// the builder canvas's stand-in for a WORKFLOW: a state pill and two button shapes. it fetches
// nothing and takes no click -- a real control would eat the drag
export function WorkflowPreview() {
  const { t } = useTranslation(['workflow', 'common'])
  return (
    <div className="space-y-3">
      <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">
        {t('pages.mockWorkflow.initialState')}
      </span>
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-md bg-surface-muted" />
        <div className="h-9 w-24 rounded-md bg-surface-muted" />
      </div>
    </div>
  )
}

import type { UseQueryResult } from '@tanstack/react-query'
import { AlertTriangle, Inbox, Loader2, Lock, SearchX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@wasichai/ui'
import { ApiError } from '../../api/client'

// data-slot: hook a theme sheet styles (ADR-035). data-state tells the three apart.
export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div role="status" data-slot="query-state" data-state="loading" className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
      <Loader2 className="size-4 animate-spin" />
      {label ?? t('common.loading')}
    </div>
  )
}

// icon: an app draws its own thing, e.g. a cube for a list of lots
export function EmptyState({ title, icon: Icon = Inbox, children }: { title: string; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <div data-slot="query-state" data-state="empty" className="flex flex-col items-center gap-2 py-12 text-center text-sm text-ink-muted">
      <Icon className="size-8 text-border" />
      <p className="font-medium text-ink">{title}</p>
      {children}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const status = error instanceof ApiError ? error.status : 0
  // 404 and 403 will not change on a retry: no message, no button
  const permanent = status === 404 || status === 403
  const [Icon, title] =
    status === 404 ? [SearchX, t('common.notFound')] : status === 403 ? [Lock, t('common.forbidden')] : [AlertTriangle, t('common.loadFailed')]
  return (
    <div role="alert" data-slot="query-state" data-state="error" className="flex flex-col items-center gap-3 py-12 text-center text-sm">
      <Icon className="size-8 text-danger" />
      <p className="font-medium text-ink">{title}</p>
      {error instanceof Error && !permanent && <p className="text-ink-muted">{error.message}</p>}
      {onRetry && !permanent && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

// loading, error or the data, in that order
export function QueryState<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return children(query.data)
}

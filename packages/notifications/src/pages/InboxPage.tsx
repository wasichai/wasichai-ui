import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { describeError, EmptyState, PageHeader, QueryState } from '@wasichai/core'
import { Button, cn, PageSizePagination } from '@wasichai/ui'
import { NotificationItem } from '../components/NotificationItem'
import { useNotifications, useNotificationSummary, useReadAll } from '../hooks'
import type { NotificationKind, NotificationState } from '../types'

const KINDS: NotificationKind[] = ['INFO', 'WARNING', 'ACTION']
const STATES: NotificationState[] = ['active', 'unread', 'snoozed']

// the tab lives in ?tab= like any page's; an unknown value falls back to the first
function useKindTab(): [NotificationKind, (kind: NotificationKind) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const kind = KINDS.find((k) => k === raw) ?? 'INFO'
  return [kind, (next) => setParams((current) => new URLSearchParams({ ...Object.fromEntries(current), tab: next }), { replace: true })]
}

export function InboxPage() {
  const { t } = useTranslation('notifications')
  const [kind, setKind] = useKindTab()
  const [state, setState] = useState<NotificationState>('active')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { summary } = useNotificationSummary()
  const readAll = useReadAll()
  const query = useNotifications({ kind, state, page, size })

  const strip = useRef<HTMLDivElement>(null)
  // WAI-ARIA tabs, automatic activation: the arrows, Home and End move the focus and select
  const move = (event: KeyboardEvent, index: number) => {
    const last = KINDS.length - 1
    const keys: Record<string, number> = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }
    if (!Object.hasOwn(keys, event.key)) return
    event.preventDefault()
    pick(KINDS[keys[event.key]])
    strip.current?.querySelectorAll<HTMLElement>('[role="tab"]')[keys[event.key]]?.focus()
  }

  const pick = (next: NotificationKind) => {
    setKind(next)
    setPage(0)
  }

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              {t('notifications.inbox.state')}
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value as NotificationState)
                  setPage(0)
                }}
                className="h-9 rounded-md border border-border-control bg-surface px-3 text-sm text-ink"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {t(`notifications.inbox.states.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" size="sm" disabled={readAll.isPending} onClick={() => readAll.mutate({ kind })}>
              {t('notifications.inbox.readAll')}
            </Button>
          </>
        }
      />
      {readAll.error && (
        <p role="alert" className="border-b border-border px-4 py-2 text-sm text-danger md:px-8">
          {describeError(readAll.error)}
        </p>
      )}
      {/* Tabs from core's ui keeps its own state; this strip is driven by the URL instead */}
      <div ref={strip} role="tablist" aria-label={t('notifications.title')} className="flex gap-1 overflow-x-auto border-b border-border px-4 md:px-8">
        {KINDS.map((k, index) => {
          const unread = summary?.kinds[k].unread ?? 0
          return (
            <button
              key={k}
              type="button"
              role="tab"
              id={`inbox-tab-${k}`}
              aria-controls="inbox-panel"
              onKeyDown={(event) => move(event, index)}
              aria-selected={k === kind}
              tabIndex={k === kind ? 0 : -1}
              onClick={() => pick(k)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                k === kind ? 'border-brand text-brand-strong' : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              {t(`notifications.kinds.${k}`)}
              {unread > 0 && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-strong">{unread}</span>}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id="inbox-panel" aria-labelledby={`inbox-tab-${kind}`}>
        <QueryState query={query}>
          {(data) =>
            data.content.length === 0 ? (
              <EmptyState title={t('notifications.inbox.empty')} />
            ) : (
              <>
                {data.content.map((item) => (
                  <NotificationItem key={item.id} item={item} />
                ))}
                <PageSizePagination
                  page={page}
                  size={size}
                  total={data.totalElements}
                  onPage={setPage}
                  onSize={(next) => {
                    setSize(next)
                    setPage(0)
                  }}
                />
              </>
            )
          }
        </QueryState>
      </div>
    </>
  )
}

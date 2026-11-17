import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Alert, type AlertTone } from '@wasichai/ui'
import { useNotificationLinks, useNotificationSummary } from './hooks'
import type { NotificationKind } from './types'

const TONES: Record<NotificationKind, AlertTone> = { INFO: 'notice', WARNING: 'warning', ACTION: 'danger' }
const MAX_TOASTS = 3
const TOAST_MS = 8000

interface Toast {
  id: string
  kind: NotificationKind
  title: string
}

// a toast for each notification that arrives while the page is open. the first summary only sets the baseline
export function NotificationToasts() {
  const { t } = useTranslation('notifications')
  const { summary, status } = useNotificationSummary()
  const { inboxPath } = useNotificationLinks()
  const [toasts, setToasts] = useState<Toast[]>([])
  // seen: one toast per id per tab. newest: an older latest (the newer one expired) is no news
  const seen = useRef(new Set<string>())
  const newest = useRef<string | null>(null)
  const baseline = useRef(false)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = (id: string) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const latest = summary?.latest
  useEffect(() => {
    if (!summary) return
    if (!baseline.current) {
      baseline.current = true
      if (latest) {
        seen.current.add(latest.id)
        newest.current = latest.publishAt
      }
      return
    }
    if (!latest || seen.current.has(latest.id)) return
    seen.current.add(latest.id)
    if (newest.current !== null && Date.parse(latest.publishAt) <= Date.parse(newest.current)) return
    newest.current = latest.publishAt
    const { id, kind, title } = latest
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a toast answers a change in the stream
    setToasts((current) => [...current, { id, kind, title }].slice(-MAX_TOASTS))
    timers.current.set(
      id,
      setTimeout(() => dismiss(id), TOAST_MS)
    )
    // the summary object changes on every push; the latest id is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, latest?.id])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  if (status === 'unavailable' || toasts.length === 0) return null
  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <Alert key={toast.id} tone={TONES[toast.kind]} onDismiss={() => dismiss(toast.id)} className="rounded border border-border bg-surface p-3 shadow-lg">
          {/* plain text, never HTML */}
          <span className="block whitespace-pre-line">{toast.title}</span>
          {inboxPath && (
            <Link to={`${inboxPath}?tab=${toast.kind}`} onClick={() => dismiss(toast.id)} className="underline">
              {t('notifications.toast.view')}
            </Link>
          )}
        </Alert>
      ))}
    </div>
  )
}

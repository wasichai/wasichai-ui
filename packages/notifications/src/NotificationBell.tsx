import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useNotificationLinks, useNotificationSummary } from './hooks'
import { NotificationToasts } from './NotificationToasts'
import type { NotificationKind } from './types'

const KINDS: NotificationKind[] = ['INFO', 'WARNING', 'ACTION']

export interface NotificationBellProps {
  // false when the app mounts <NotificationToasts /> itself
  toasts?: boolean
}

// unread badge, an overdue dot and a polite announcement. it also draws the toasts, so a shell gets both by mounting it
export function NotificationBell({ toasts = true }: NotificationBellProps) {
  const { t } = useTranslation('notifications')
  const { summary, status } = useNotificationSummary()
  const { inboxPath } = useNotificationLinks()
  const unread = summary ? KINDS.reduce((total, kind) => total + summary.kinds[kind].unread, 0) : 0
  const overdue = summary ? summary.kinds.ACTION.overdue > 0 : false
  const announcement = useGrowthAnnouncement(unread, summary !== undefined, (count) => t('notifications.bell.announce', { count }))

  if (status === 'unavailable') return null
  const label = t('notifications.bell.label', { count: unread })
  const content = (
    <>
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 font-semibold text-on-danger"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
      {overdue && <span data-testid="notification-overdue-dot" aria-hidden="true" className="absolute right-0 bottom-0 size-2 rounded-full bg-danger" />}
    </>
  )
  const className = 'relative inline-flex items-center justify-center rounded p-1.5 hover:bg-surface-muted'
  return (
    <>
      {inboxPath ? (
        <Link to={inboxPath} aria-label={label} className={className}>
          {content}
        </Link>
      ) : (
        <span role="img" aria-label={label} className={className}>
          {content}
        </span>
      )}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {toasts && <NotificationToasts />}
    </>
  )
}

// the text appears only when the total grows after the first summary, so loading the page is silent
function useGrowthAnnouncement(unread: number, known: boolean, text: (count: number) => string): string {
  const previous = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (!known) return
    const before = previous.current
    previous.current = unread
    // eslint-disable-next-line react-hooks/set-state-in-effect -- announces a change seen in the stream
    if (before !== null && unread > before) setAnnouncement(text(unread))
    // text changes with the language only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread, known])
  return announcement
}

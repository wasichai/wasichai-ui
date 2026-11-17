import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { describeError } from '@wasichai/core'
import { Badge, Button, cn } from '@wasichai/ui'
import { useDismiss, useMarkRead, useSnooze } from '../hooks'
import { NotificationLinkView } from '../NotificationLinkView'
import type { InboxItem } from '../types'
import { SnoozeMenu } from './SnoozeMenu'

export function NotificationItem({ item }: { item: InboxItem }) {
  const { t, i18n } = useTranslation('notifications')
  const markRead = useMarkRead()
  const dismiss = useDismiss()
  const snooze = useSnooze()
  const format = (iso: string) => new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const busy = markRead.isPending || dismiss.isPending || snooze.isPending
  // a refusal (the snooze limit's 400, a 409) says why on the item itself
  const error = markRead.error ?? dismiss.error ?? snooze.error
  // a new action starts clean: an old refusal must not outlive a later success
  const resetAll = () => {
    markRead.reset()
    dismiss.reset()
    snooze.reset()
  }

  return (
    <article data-slot="notification-item" className="flex flex-col gap-2 border-b border-border px-4 py-3 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={cn('break-words text-sm text-ink', item.read ? 'font-normal' : 'font-semibold')}>
            {!item.read && <span className="sr-only">{t('notifications.inbox.unread')}: </span>}
            <NotificationLinkView id={item.id} link={item.link} className="hover:underline">
              {item.title}
            </NotificationLinkView>
          </h2>
          {/* plain text: markup in a body is printed, never interpreted */}
          {item.body && <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-muted">{item.body}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!item.read && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                resetAll()
                markRead.mutate(item.id)
              }}
            >
              <Check className="size-4" aria-hidden />
              {t('notifications.inbox.markRead')}
            </Button>
          )}
          <SnoozeMenu
            disabled={busy}
            onSnooze={(until) => {
              resetAll()
              snooze.mutate({ id: item.id, until })
            }}
          />
          {item.dismissible && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                resetAll()
                dismiss.mutate(item.id)
              }}
            >
              <X className="size-4" aria-hidden />
              {t('notifications.inbox.dismiss')}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span>{t('notifications.inbox.published', { date: format(item.publishAt) })}</span>
        {item.kind === 'ACTION' && item.dueAt && <span>{t('notifications.inbox.due', { date: format(item.dueAt) })}</span>}
        {item.kind === 'ACTION' && item.overdue && <Badge className="bg-danger-soft text-danger">{t('notifications.inbox.overdue')}</Badge>}
        {item.snoozedUntil && <span>{t('notifications.inbox.snoozedUntil', { date: format(item.snoozedUntil) })}</span>}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {describeError(error)}
        </p>
      )}
    </article>
  )
}

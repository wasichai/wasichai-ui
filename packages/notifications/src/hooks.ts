import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dismiss, getSummary, listNotifications, markRead, readAll, snooze, type ListFilters } from './api'
import { useNotificationsContext } from './NotificationsProvider'
import { notificationKeys } from './queryKeys'
import type { SummaryStatus } from './stream/sharedStream'
import type { NotificationKind, NotificationLinkResolver, NotificationSummary } from './types'

export function useNotificationSummary(): { summary?: NotificationSummary; status: SummaryStatus } {
  const { status } = useNotificationsContext()
  // the shared stream (or its polling floor) fills this entry; the hook never asks on its own
  const { data } = useQuery({ queryKey: notificationKeys.summary, queryFn: getSummary, enabled: false })
  return { summary: data, status }
}

export function useNotificationLinks(): { resolveLink?: NotificationLinkResolver; inboxPath?: string } {
  const { resolveLink, inboxPath } = useNotificationsContext()
  return { resolveLink, inboxPath }
}

export function useNotifications(filters: ListFilters) {
  return useQuery({ queryKey: notificationKeys.list(filters), queryFn: () => listNotifications(filters) })
}

// the stream confirms the new counts too, but in polling mode it lags up to a minute: fetch the summary now.
// the summary query is disabled, so invalidating alone would not refetch it
function useNotificationMutation<T>(mutationFn: (variables: T) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.fetchQuery({ queryKey: notificationKeys.summary, queryFn: getSummary, staleTime: 0 }).catch(() => undefined),
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists })
      ])
  })
}

export function useMarkRead() {
  return useNotificationMutation((id: string) => markRead(id))
}

export function useDismiss() {
  return useNotificationMutation((id: string) => dismiss(id))
}

export function useSnooze() {
  return useNotificationMutation(({ id, until }: { id: string; until: string }) => snooze(id, until))
}

export function useReadAll() {
  return useNotificationMutation(({ kind }: { kind?: NotificationKind } = {}) => readAll(kind))
}

import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth, useWasichai, useWasichaiLinks } from '@wasichai/core'
import { getSummary } from './api'
import { notificationKeys } from './queryKeys'
import { startSharedStream, type SummaryStatus } from './stream/sharedStream'
import type { NotificationLinkResolver, NotificationSummary } from './types'

export interface NotificationsContextValue {
  status: SummaryStatus
  resolveLink?: NotificationLinkResolver
  inboxPath?: string
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function useNotificationsContext(): NotificationsContextValue {
  const value = use(NotificationsContext)
  if (!value) throw new Error('notifications hooks must be used inside NotificationsProvider (notificationsModule mounts it)')
  return value
}

export interface NotificationsProviderProps {
  children: ReactNode
  // how a notification's link becomes an href in this app
  resolveLink?: NotificationLinkResolver
  // where "see all" goes. default: the inbox route, when registered
  inboxPath?: string
}

// streams the signed-in person's summary into the query cache, once per browser
export function NotificationsProvider({ children, resolveLink, inboxPath }: NotificationsProviderProps) {
  const { config, apiClient } = useWasichai()
  const { user, signOut } = useAuth()
  const links = useWasichaiLinks()
  const queryClient = useQueryClient()
  const userId = user?.id
  // keyed by user, so a new session never shows the previous one's status
  const [state, setState] = useState<{ userId: string; status: SummaryStatus } | null>(null)
  const signOutRef = useRef(signOut)
  useEffect(() => {
    signOutRef.current = signOut
  }, [signOut])

  useEffect(() => {
    if (!userId) return
    return startSharedStream({
      name: `${config.storagePrefix}.notifications`,
      userId,
      baseUrl: apiClient.baseUrl,
      getToken: () => apiClient.getToken(),
      tokenKey: apiClient.keys.token,
      fetchSummary: getSummary,
      onSummary: (summary) => {
        const previous = queryClient.getQueryData<NotificationSummary>(notificationKeys.summary)
        queryClient.setQueryData(notificationKeys.summary, summary)
        // the lists follow the counts: a change means something arrived, was read or expired
        if (previous && JSON.stringify(previous) !== JSON.stringify(summary)) void queryClient.invalidateQueries({ queryKey: notificationKeys.lists })
      },
      onStatus: (status) => setState({ userId, status }),
      onUnauthorized: () => signOutRef.current()
    })
  }, [userId, config.storagePrefix, apiClient, queryClient])

  const status: SummaryStatus = !userId ? 'unavailable' : state?.userId === userId ? state.status : 'live'
  const inbox = inboxPath ?? (links.has('notifications:inbox') ? links.to('notifications:inbox') : undefined)
  const value = useMemo(() => ({ status, resolveLink, inboxPath: inbox }), [status, resolveLink, inbox])
  return <NotificationsContext value={value}>{children}</NotificationsContext>
}

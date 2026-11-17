import { Bell } from 'lucide-react'
import type { ReactNode } from 'react'
import type { WasichaiModule } from '@wasichai/core'
import { notificationsMessages } from './i18n'
import { NotificationsProvider } from './NotificationsProvider'
import type { NotificationLinkResolver } from './types'

export const NOTIFICATIONS_MODULE_ID = 'notifications'

export interface NotificationsModuleOptions {
  // how a link of a notification becomes an href in this app. default: core's links
  resolveLink?: NotificationLinkResolver
}

// the bell is added by a later task
export function notificationsModule(options: NotificationsModuleOptions = {}): WasichaiModule {
  const Provider = ({ children }: { children: ReactNode }) => <NotificationsProvider resolveLink={options.resolveLink}>{children}</NotificationsProvider>
  return {
    id: NOTIFICATIONS_MODULE_ID,
    basePath: 'notifications',
    routes: [{ id: 'inbox', path: '', lazy: () => import('./pages/InboxPage').then((m) => ({ default: m.InboxPage })) }],
    nav: [{ group: 'data', labelKey: 'notifications:nav.inbox', order: 90, icon: Bell, route: 'inbox' }],
    i18n: notificationsMessages,
    providers: [Provider]
  }
}

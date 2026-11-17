import { Bell } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { notificationsMessages } from './i18n'
import type { NotificationLinkResolver } from './types'

export const NOTIFICATIONS_MODULE_ID = 'notifications'

export interface NotificationsModuleOptions {
  // how a link of a notification becomes an href in this app. default: core's links
  resolveLink?: NotificationLinkResolver
}

// the provider and the bell are added by later tasks; options.resolveLink goes to the provider then
export function notificationsModule(_options: NotificationsModuleOptions = {}): WasichaiModule {
  return {
    id: NOTIFICATIONS_MODULE_ID,
    basePath: 'notifications',
    routes: [{ id: 'inbox', path: '', lazy: () => import('./pages/InboxPage').then((m) => ({ default: m.InboxPage })) }],
    nav: [{ group: 'data', labelKey: 'notifications:nav.inbox', order: 90, icon: Bell, route: 'inbox' }],
    i18n: notificationsMessages
  }
}

import type { WasichaiLinks } from '@wasichai/core'

// wire shapes of wasichai 2.2.0, GET /auth/me/notifications*
export type NotificationKind = 'INFO' | 'WARNING' | 'ACTION'

export type NotificationState = 'active' | 'unread' | 'snoozed'

export type NotificationLink =
  | { type: 'RECORD'; object: string; recordId: string; tab?: string | null }
  | { type: 'ROUTE'; route: string; params?: Record<string, string> | null; tab?: string | null }
  | { type: 'URL'; url: string }

export interface InboxItem {
  id: string
  kind: NotificationKind
  title: string
  // plain text, never HTML
  body: string | null
  link: NotificationLink | null
  publishAt: string
  expiresAt: string | null
  dueAt: string | null
  overdue: boolean
  source: string
  read: boolean
  snoozedUntil: string | null
  dismissible: boolean
}

export interface KindCounts {
  active: number
  unread: number
  overdue: number
}

export interface NotificationSummary {
  kinds: Record<NotificationKind, KindCounts>
  latest: { id: string; kind: NotificationKind; title: string; publishAt: string; link: NotificationLink | null } | null
}

// core does not export its page envelope
export interface NotificationPage {
  content: InboxItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface NotificationHref {
  href: string
  external: boolean
}

// null = the link leads nowhere this app can open: show the text without a link
export type NotificationLinkResolver = (link: NotificationLink, links: WasichaiLinks) => NotificationHref | null

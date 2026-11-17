import { api } from '@wasichai/core'
import type { NotificationKind, NotificationPage, NotificationState, NotificationSummary } from './types'

const BASE = '/auth/me/notifications'

export interface ListFilters {
  kind?: NotificationKind
  state?: NotificationState
  page: number
  size: number
}

export function getSummary(): Promise<NotificationSummary> {
  return api<NotificationSummary>(`${BASE}/summary`)
}

export function listNotifications({ kind, state, page, size }: ListFilters): Promise<NotificationPage> {
  const query = new URLSearchParams()
  if (kind) query.set('kind', kind)
  if (state) query.set('state', state)
  query.set('page', String(page))
  query.set('size', String(size))
  return api<NotificationPage>(`${BASE}?${query}`)
}

export function markRead(id: string): Promise<void> {
  return api<void>(`${BASE}/${id}/read`, { method: 'POST' })
}

export function dismiss(id: string): Promise<void> {
  return api<void>(`${BASE}/${id}/dismiss`, { method: 'POST' })
}

export function snooze(id: string, until: string): Promise<void> {
  return api<void>(`${BASE}/${id}/snooze`, { method: 'POST', body: JSON.stringify({ until }) })
}

// no body marks every kind
export function readAll(kind?: NotificationKind): Promise<void> {
  return api<void>(`${BASE}/read-all`, { method: 'POST', ...(kind ? { body: JSON.stringify({ kind }) } : {}) })
}

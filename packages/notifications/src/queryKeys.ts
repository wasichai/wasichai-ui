import type { ListFilters } from './api'

export const notificationKeys = {
  summary: ['notifications', 'summary'] as const,
  lists: ['notifications', 'list'] as const,
  list: (filters: ListFilters) => ['notifications', 'list', filters] as const
}

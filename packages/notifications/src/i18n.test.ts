import { describe, expect, it } from 'vitest'
import { notificationsMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('notifications messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(notificationsMessages.en)).toEqual(leaves(notificationsMessages.es))
  })

  it('calls the feature Alertas with its three groups', () => {
    expect(notificationsMessages.es.nav.inbox).toBe('Alertas')
    expect(notificationsMessages.es.notifications.kinds).toEqual({ INFO: 'Comunicados', WARNING: 'Advertencias', ACTION: 'Pendientes' })
  })
})

import { describe, expect, it } from 'vitest'
import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { NotificationBell } from './NotificationBell'
import { notificationsModule } from './module'

describe('notificationsModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, notificationsModule()])).not.toThrow()
  })

  it('mounts the inbox at its base path, and no admin or rules route', () => {
    const links = createLinks(createRegistry([coreModule, notificationsModule()]))
    expect(links.has('notifications:inbox')).toBe(true)
    expect(links.to('notifications:inbox')).toBe('/notifications')
    expect(links.has('notifications:admin')).toBe(false)
    expect(links.has('notifications:rules')).toBe(false)
  })

  it('adds one nav entry for everyone', () => {
    const items = createRegistry([coreModule, notificationsModule()]).navGroups.flatMap((group) => group.items)
    expect(items).toContainEqual(expect.objectContaining({ labelKey: 'notifications:nav.inbox', to: '/notifications' }))
  })

  it('wraps the app in its provider, and draws the bell in the shell', () => {
    const module = notificationsModule()
    expect(module.providers).toHaveLength(1)
    expect(module.shellActions).toEqual([{ key: 'notifications', component: NotificationBell }])
  })
})

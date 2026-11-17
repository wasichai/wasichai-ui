import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { dismiss, getSummary, listNotifications, markRead, readAll, snooze } from './api'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('notifications api', () => {
  it('reads the summary', async () => {
    fetch = mockFetch([{ path: '/auth/me/notifications/summary', body: { kinds: {}, latest: null } }])
    await getSummary()
    expect(fetch.calls[0]).toMatchObject({ path: '/auth/me/notifications/summary' })
  })

  it('lists with kind, state, page and size', async () => {
    fetch = mockFetch([{ path: '/auth/me/notifications', body: { content: [] } }])
    await listNotifications({ kind: 'ACTION', state: 'unread', page: 2, size: 20 })
    expect(fetch.calls[0].path).toBe('/auth/me/notifications?kind=ACTION&state=unread&page=2&size=20')
  })

  it('omits an absent kind and state', async () => {
    fetch = mockFetch([{ path: '/auth/me/notifications', body: { content: [] } }])
    await listNotifications({ page: 0, size: 10 })
    expect(fetch.calls[0].path).toBe('/auth/me/notifications?page=0&size=10')
  })

  it('posts read, dismiss and snooze to the item', async () => {
    fetch = mockFetch([
      { path: '/auth/me/notifications/n1/read', method: 'POST', status: 204 },
      { path: '/auth/me/notifications/n1/dismiss', method: 'POST', status: 204 },
      { path: '/auth/me/notifications/n1/snooze', method: 'POST', status: 204 }
    ])
    await markRead('n1')
    await dismiss('n1')
    await snooze('n1', '2026-10-07T08:00:00Z')
    expect(fetch.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /auth/me/notifications/n1/read',
      'POST /auth/me/notifications/n1/dismiss',
      'POST /auth/me/notifications/n1/snooze'
    ])
    expect(fetch.calls[2].body).toEqual({ until: '2026-10-07T08:00:00Z' })
  })

  it('marks everything read, of one kind or of all', async () => {
    fetch = mockFetch([{ path: '/auth/me/notifications/read-all', method: 'POST', status: 204 }])
    await readAll('INFO')
    await readAll()
    expect(fetch.calls[0].body).toEqual({ kind: 'INFO' })
    expect(fetch.calls[1].body).toBeNull()
  })
})

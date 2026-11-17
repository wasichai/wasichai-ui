import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useAuth } from '@wasichai/core'
import { renderWithProviders, type WasichaiRenderOptions } from '@wasichai/testing'
import { useMarkRead, useNotificationLinks, useNotifications, useNotificationSummary, useReadAll, useSnooze } from './hooks'
import { notificationsModule } from './module'
import type { NotificationLinkResolver, NotificationSummary } from './types'

const encoder = new TextEncoder()

function summary(unread: number): NotificationSummary {
  return {
    kinds: {
      INFO: { active: unread, unread, overdue: 0 },
      WARNING: { active: 0, unread: 0, overdue: 0 },
      ACTION: { active: 0, unread: 0, overdue: 0 }
    },
    latest: null
  }
}

const PAGE = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }

interface Call {
  method: string
  path: string
  body: unknown
}

// the stream answers with a body the test feeds; every other call answers from `rest`
// streamStatus: what each stream request answers in turn, the last one repeating
function stubFetch(streamStatus: number | number[] = 200, rest: Record<string, { status: number; body?: unknown }> = {}) {
  const calls: Call[] = []
  const feeds: ((s: NotificationSummary) => void)[] = []
  let streamCalls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = (init.method ?? 'GET').toUpperCase()
      calls.push({ method, path, body: typeof init.body === 'string' ? JSON.parse(init.body) : null })
      if (path === '/auth/me/notifications/stream') {
        const statuses = [streamStatus].flat()
        const status = statuses[Math.min(streamCalls++, statuses.length - 1)]
        if (status !== 200) return new Response(null, { status })
        let controller!: ReadableStreamDefaultController<Uint8Array>
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            controller = c
          }
        })
        init.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
        feeds.push((s) => controller.enqueue(encoder.encode(`event:summary\ndata:${JSON.stringify(s)}\n\n`)))
        return new Response(body, { status: 200 })
      }
      const answer = rest[`${method} ${path.split('?')[0]}`]
      if (!answer) return new Response(JSON.stringify({ title: 'Not Found' }), { status: 404 })
      if (answer.status === 204) return new Response(null, { status: 204 })
      return new Response(JSON.stringify(answer.body ?? null), { status: answer.status, headers: { 'Content-Type': 'application/json' } })
    })
  )
  return {
    calls,
    push: (s: NotificationSummary) => act(async () => feeds.at(-1)?.(s)),
    streams: () => calls.filter((call) => call.path === '/auth/me/notifications/stream').length
  }
}

function render<T>(hook: () => T, options: WasichaiRenderOptions = {}) {
  let result!: { current: T }
  function Probe() {
    result = { current: hook() }
    return null
  }
  const rendered = renderWithProviders(<Probe />, { modules: [notificationsModule()], ...options })
  return {
    ...rendered,
    result: {
      get current() {
        return result.current
      }
    }
  }
}

describe('notifications provider and hooks', () => {
  beforeEach(() => {
    localStorage.setItem('wasichai-test.token', 'tok')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('reports the streamed summary as live and keeps it in the query cache', async () => {
    const net = stubFetch()
    const { result, queryClient } = render(() => useNotificationSummary())
    await waitFor(() => expect(net.streams()).toBe(1))
    expect(net.calls.find((call) => call.path.endsWith('/stream'))).toBeDefined()

    await net.push(summary(2))
    await waitFor(() => expect(result.current.summary).toEqual(summary(2)))
    expect(result.current.status).toBe('live')
    expect(queryClient.getQueryData(['notifications', 'summary'])).toEqual(summary(2))
  })

  it('refetches the lists when the summary changes, not when it repeats', async () => {
    const net = stubFetch(200, { 'GET /auth/me/notifications': { status: 200, body: PAGE } })
    const { result } = render(() => useNotifications({ page: 0, size: 20 }))
    await waitFor(() => expect(result.current.data).toEqual(PAGE))
    const lists = () => net.calls.filter((call) => call.path.startsWith('/auth/me/notifications?')).length
    expect(lists()).toBe(1)

    await net.push(summary(1))
    await net.push(summary(2))
    await waitFor(() => expect(lists()).toBe(2))
    await net.push(summary(2))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(lists()).toBe(2)
  })

  it('marks one read, snoozes and reads all, then refetches the lists', async () => {
    const net = stubFetch(200, {
      'GET /auth/me/notifications': { status: 200, body: PAGE },
      'POST /auth/me/notifications/n1/read': { status: 204 },
      'POST /auth/me/notifications/n1/snooze': { status: 204 },
      'POST /auth/me/notifications/read-all': { status: 204 }
    })
    const { result } = render(() => ({ list: useNotifications({ page: 0, size: 20 }), read: useMarkRead(), snooze: useSnooze(), all: useReadAll() }))
    await waitFor(() => expect(result.current.list.data).toEqual(PAGE))
    const lists = () => net.calls.filter((call) => call.path.startsWith('/auth/me/notifications?')).length

    await act(() => result.current.read.mutateAsync('n1'))
    await waitFor(() => expect(lists()).toBe(2))
    await act(() => result.current.snooze.mutateAsync({ id: 'n1', until: '2026-11-18T08:00:00Z' }))
    await act(() => result.current.all.mutateAsync({ kind: 'ACTION' }))
    await waitFor(() => expect(lists()).toBe(4))
    expect(net.calls.filter((call) => call.method === 'POST').map((call) => [call.path, call.body])).toEqual([
      ['/auth/me/notifications/n1/read', null],
      ['/auth/me/notifications/n1/snooze', { until: '2026-11-18T08:00:00Z' }],
      ['/auth/me/notifications/read-all', { kind: 'ACTION' }]
    ])
  })

  it('refreshes through the api client on a stream 401 and reopens it, without signing out', async () => {
    const net = stubFetch([401, 200], { 'GET /auth/me/notifications/summary': { status: 200, body: summary(7) } })
    const { result } = render(() => ({ auth: useAuth(), summary: useNotificationSummary() }))
    await waitFor(() => expect(net.streams()).toBe(2))
    expect(net.calls.filter((call) => call.path === '/auth/me/notifications/summary')).toHaveLength(1)
    await waitFor(() => expect(result.current.summary.summary).toEqual(summary(7)))
    expect(result.current.auth.user).not.toBeNull()
    expect(localStorage.getItem('wasichai-test.token')).toBe('tok')
  })

  it("leaves the sign-out to core's client when the refresh is refused too", async () => {
    stubFetch(401, { 'GET /auth/me/notifications/summary': { status: 401, body: { title: 'Unauthorized' } } })
    const { result } = render(() => useAuth())
    await waitFor(() => expect(result.current.user).toBeNull())
  })

  it('reports unavailable when the module is not installed', async () => {
    stubFetch(404)
    const { result } = render(() => useNotificationSummary())
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('opens no stream when signed out', async () => {
    const net = stubFetch()
    const { result } = render(() => useNotificationSummary(), { user: null })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(net.streams()).toBe(0)
    expect(result.current.status).toBe('unavailable')
  })

  it("keeps the app's link resolver and the inbox path", () => {
    stubFetch()
    const resolveLink: NotificationLinkResolver = () => null
    const { result } = render(() => useNotificationLinks(), { modules: [notificationsModule({ resolveLink })] })
    expect(result.current.resolveLink).toBe(resolveLink)
    expect(result.current.inboxPath).toBe('/notifications')
  })

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>
    expect(() => renderHook(() => useNotificationSummary(), { wrapper })).toThrow(/NotificationsProvider/)
  })
})

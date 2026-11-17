import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { NotificationBell } from './NotificationBell'
import { notificationsModule } from './module'
import { NotificationToasts } from './NotificationToasts'
import type { NotificationKind, NotificationSummary } from './types'

const encoder = new TextEncoder()

type Latest = NonNullable<NotificationSummary['latest']>

function summary(unread: number, options: { overdue?: number; latest?: Partial<Latest> & { id: string } } = {}): NotificationSummary {
  return {
    kinds: {
      INFO: { active: unread, unread, overdue: 0 },
      WARNING: { active: 0, unread: 0, overdue: 0 },
      ACTION: { active: 0, unread: 0, overdue: options.overdue ?? 0 }
    },
    latest: options.latest ? { kind: 'INFO' as NotificationKind, title: 'Cierre', publishAt: '2026-11-17T10:00:00Z', link: null, ...options.latest } : null
  }
}

// the stream answers with a body the test feeds
function stubStream(status = 200) {
  const feeds: ((s: NotificationSummary) => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (!String(input).endsWith('/auth/me/notifications/stream') || status !== 200) return new Response(null, { status: status === 200 ? 204 : status })
      let controller!: ReadableStreamDefaultController<Uint8Array>
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c
        }
      })
      init.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
      feeds.push((s) => controller.enqueue(encoder.encode(`event:summary\ndata:${JSON.stringify(s)}\n\n`)))
      return new Response(body, { status: 200 })
    })
  )
  return {
    feed: (s: NotificationSummary) => feeds.at(-1)?.(s),
    // the stream reads one chunk per turn: let it land before the next push
    push: (s: NotificationSummary) =>
      act(async () => {
        feeds.at(-1)?.(s)
        await new Promise((resolve) => setTimeout(resolve, 20))
      }),
    ready: () => feeds.length > 0
  }
}

function renderBell(ui = <NotificationBell />) {
  return renderWithProviders(ui, { modules: [notificationsModule()] })
}

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.setItem('wasichai-test.token', 'tok')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows the unread total in a badge hidden from screen readers, and in the label', async () => {
    const net = stubStream()
    renderBell()
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(3))
    const link = await screen.findByRole('link', { name: 'Alertas, 3 sin leer' })
    expect(link).toHaveAttribute('href', '/notifications')
    expect(screen.getByText('3')).toHaveAttribute('aria-hidden', 'true')
  })

  it('caps the badge at 99+', async () => {
    const net = stubStream()
    renderBell()
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(120))
    expect(await screen.findByText('99+')).toBeInTheDocument()
  })

  it('shows a dot only when a to-do is overdue', async () => {
    const net = stubStream()
    renderBell()
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(1))
    await screen.findByRole('link', { name: 'Alertas, 1 sin leer' })
    expect(screen.queryByTestId('notification-overdue-dot')).toBeNull()
    await net.push(summary(1, { overdue: 1 }))
    expect(await screen.findByTestId('notification-overdue-dot')).toBeInTheDocument()
  })

  it('is hidden when notifications are unavailable', async () => {
    stubStream(404)
    renderBell()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('announces in a polite live region when the unread total grows', async () => {
    const net = stubStream()
    renderBell()
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(1))
    await net.push(summary(2))
    const region = await screen.findByText('2 alertas sin leer')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveClass('sr-only')
  })
})

describe('NotificationToasts', () => {
  beforeEach(() => {
    localStorage.setItem('wasichai-test.token', 'tok')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('makes no toast for the first summary', async () => {
    const net = stubStream()
    renderBell(<NotificationToasts />)
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(1, { latest: { id: 'n1' } }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByText('Cierre')).toBeNull()
  })

  it('makes one toast for a newer latest, linking to its tab, and none for the same id again', async () => {
    const net = stubStream()
    renderBell(<NotificationToasts />)
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(1, { latest: { id: 'n1' } }))
    await net.push(summary(2, { latest: { id: 'n2', kind: 'ACTION', title: 'Pagos sin entregar', publishAt: '2026-11-17T11:00:00Z' } }))
    expect(await screen.findByText('Pagos sin entregar')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver en Alertas' })).toHaveAttribute('href', '/notifications?tab=ACTION')

    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByText('Pagos sin entregar')).toBeNull()
    await net.push(summary(3, { latest: { id: 'n2', kind: 'ACTION', title: 'Pagos sin entregar', publishAt: '2026-11-17T11:00:00Z' } }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByText('Pagos sin entregar')).toBeNull()
  })

  it('stacks at most three toasts', async () => {
    const net = stubStream()
    renderBell(<NotificationToasts />)
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(0, { latest: { id: 'n0' } }))
    for (const n of [1, 2, 3, 4]) {
      await net.push(summary(n, { latest: { id: `n${n}`, title: `Aviso ${n}`, publishAt: `2026-11-17T1${n}:00:00Z` } }))
    }
    await waitFor(() => expect(screen.getByText('Aviso 4')).toBeInTheDocument())
    expect(screen.queryByText('Aviso 1')).toBeNull()
    expect(screen.getAllByText(/^Aviso/)).toHaveLength(3)
  })

  it('drops a toast after eight seconds', async () => {
    const net = stubStream()
    renderBell(<NotificationToasts />)
    await waitFor(() => expect(net.ready()).toBe(true))
    await net.push(summary(0, { latest: { id: 'n0' } }))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await act(async () => {
      net.feed(summary(1, { latest: { id: 'n1', title: 'Aviso 1', publishAt: '2026-11-17T11:00:00Z' } }))
      await vi.advanceTimersByTimeAsync(20)
    })
    expect(screen.getByText('Aviso 1')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7900)
    })
    expect(screen.getByText('Aviso 1')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(screen.queryByText('Aviso 1')).toBeNull()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationSummary } from '../types'
import { startSharedStream, type ChannelLike, type LockManagerLike, type SharedStreamOptions, type SummaryStatus } from './sharedStream'

const PREFIX = 'wasichai-test'
const TOKEN_KEY = 'wasichai-test.token'
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

// a stream response the test feeds by hand; it ends when the request is aborted
function streamResponse(signal?: AbortSignal | null): { response: Response; push: (s: NotificationSummary) => void } {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    }
  })
  signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
  return {
    response: new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    push: (s) => controller.enqueue(encoder.encode(`event:summary\ndata:${JSON.stringify(s)}\n\n`))
  }
}

// navigator.locks between tabs: per name, one holder and the rest wait in order
function fakeLocks(): LockManagerLike & { held: () => string[] } {
  const holders = new Set<string>()
  const queues = new Map<string, (() => void)[]>()
  const queue = (name: string) => queues.get(name) ?? queues.set(name, []).get(name)!
  const next = (name: string) => {
    holders.delete(name)
    queue(name).shift()?.()
  }
  return {
    held: () => [...holders],
    request: (name, options, callback) =>
      new Promise((resolve, reject) => {
        const run = () => {
          holders.add(name)
          Promise.resolve(callback()).then(
            (value) => {
              next(name)
              resolve(value)
            },
            (error) => {
              next(name)
              reject(error)
            }
          )
        }
        if (!holders.has(name)) return run()
        queue(name).push(run)
        options.signal?.addEventListener('abort', () => {
          const index = queue(name).indexOf(run)
          if (index !== -1) queue(name).splice(index, 1)
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
  }
}

// BroadcastChannel between tabs: a message reaches every other open channel of the name, never the sender
function fakeChannels(): (name: string) => ChannelLike {
  const open = new Set<{ name: string; listeners: Set<(event: MessageEvent) => void> }>()
  return (name) => {
    const self = { name, listeners: new Set<(event: MessageEvent) => void>() }
    open.add(self)
    return {
      postMessage: (data) => {
        for (const other of open) {
          if (other === self || other.name !== name) continue
          queueMicrotask(() => other.listeners.forEach((listener) => listener(new MessageEvent('message', { data }))))
        }
      },
      addEventListener: (_type, listener) => self.listeners.add(listener),
      close: () => open.delete(self)
    }
  }
}

interface Tab {
  stop: () => void
  onSummary: ReturnType<typeof vi.fn<(s: NotificationSummary) => void>>
  onStatus: ReturnType<typeof vi.fn<(s: SummaryStatus) => void>>
  fetchSummary: ReturnType<typeof vi.fn<() => Promise<NotificationSummary>>>
}

function openTab(overrides: Partial<SharedStreamOptions> = {}): Tab {
  const onSummary = vi.fn<(s: NotificationSummary) => void>()
  const onStatus = vi.fn<(s: SummaryStatus) => void>()
  const fetchSummary = vi.fn<() => Promise<NotificationSummary>>().mockResolvedValue(summary(9))
  const stop = startSharedStream({
    prefix: PREFIX,
    userId: 'u1',
    baseUrl: '/api',
    getToken: () => 'tok',
    tokenKey: TOKEN_KEY,
    fetchSummary,
    onSummary,
    onStatus,
    ...overrides
  })
  return { stop, onSummary, onStatus, fetchSummary }
}

const settle = () => vi.advanceTimersByTimeAsync(0)

describe('startSharedStream', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
  let streams: { push: (s: NotificationSummary) => void; signal?: AbortSignal | null }[]

  beforeEach(() => {
    vi.useFakeTimers()
    streams = []
    fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      const stream = streamResponse(init?.signal)
      streams.push({ push: stream.push, signal: init?.signal })
      return stream.response
    })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens one stream for two tabs, and the follower gets the leader summary', async () => {
    const locks = fakeLocks()
    const channel = fakeChannels()
    const leader = openTab({ locks, channel })
    await settle()
    const follower = openTab({ locks, channel })
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    streams[0].push(summary(3))
    await settle()
    expect(leader.onSummary).toHaveBeenLastCalledWith(summary(3))
    expect(follower.onSummary).toHaveBeenLastCalledWith(summary(3))
    leader.stop()
    follower.stop()
  })

  it('answers a new tab hello with the last summary', async () => {
    const locks = fakeLocks()
    const channel = fakeChannels()
    const leader = openTab({ locks, channel })
    await settle()
    streams[0].push(summary(4))
    await settle()

    const late = openTab({ locks, channel })
    await settle()
    expect(late.onSummary).toHaveBeenLastCalledWith(summary(4))
    expect(late.onStatus).toHaveBeenLastCalledWith('live')
    leader.stop()
    late.stop()
  })

  it('hands over to the waiting tab when the leader unmounts', async () => {
    const locks = fakeLocks()
    const channel = fakeChannels()
    const leader = openTab({ locks, channel })
    await settle()
    const follower = openTab({ locks, channel })
    await settle()

    leader.stop()
    await settle()
    expect(streams[0].signal?.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    streams[1].push(summary(5))
    await settle()
    expect(follower.onSummary).toHaveBeenLastCalledWith(summary(5))
    follower.stop()
  })

  it("does not keep another user's tab waiting behind this user's leader", async () => {
    const locks = fakeLocks()
    const channel = fakeChannels()
    const leader = openTab({ locks, channel })
    await settle()
    const other = openTab({ locks, channel, userId: 'u2' })
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(locks.held()).toEqual(['wasichai-test.notifications.u1', 'wasichai-test.notifications.u2'])
    streams[0].push(summary(6))
    await settle()
    expect(leader.onSummary).toHaveBeenCalledWith(summary(6))
    expect(other.onSummary).not.toHaveBeenCalled()
    leader.stop()
    other.stop()
  })

  it('treats a missing token like a 401: refreshes through the api client and reopens', async () => {
    const getToken = vi.fn<() => string | null>().mockReturnValueOnce(null).mockReturnValue('tok')
    const locks = fakeLocks()
    const tab = openTab({ locks, channel: fakeChannels(), getToken })
    await settle()
    expect(tab.fetchSummary).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(tab.onStatus).toHaveBeenLastCalledWith('live')
    expect(locks.held()).toEqual(['wasichai-test.notifications.u1'])
    tab.stop()
  })

  it('does not publish a refresh that lands after stop', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    let answer!: (s: NotificationSummary) => void
    const tab = openTab({ locks: null, channel: null, fetchSummary: () => new Promise((resolve) => (answer = resolve)) })
    await settle()
    tab.stop()
    answer(summary(8))
    await settle()
    expect(tab.onSummary).not.toHaveBeenCalled()
  })

  it('polls the summary every 60 s while the stream retries, and stops once it is open again', async () => {
    let attempt = 0
    fetchMock.mockImplementation(async (_input, init) => {
      attempt++
      // backoff 1, 2, 4, 8, 16, 30, 30 s: the eighth attempt, at 91 s, connects
      if (attempt < 8) throw new TypeError('network down')
      const stream = streamResponse(init?.signal)
      streams.push({ push: stream.push, signal: init?.signal })
      return stream.response
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tab = openTab({ locks: null, channel: null })
    await settle()
    expect(tab.onStatus).toHaveBeenLastCalledWith('polling')

    await vi.advanceTimersByTimeAsync(59_000)
    expect(tab.fetchSummary).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(tab.fetchSummary).toHaveBeenCalledTimes(1)
    expect(tab.onSummary).toHaveBeenLastCalledWith(summary(9))

    await vi.advanceTimersByTimeAsync(31_000)
    expect(tab.onStatus).toHaveBeenLastCalledWith('live')
    await vi.advanceTimersByTimeAsync(180_000)
    expect(tab.fetchSummary).toHaveBeenCalledTimes(1)
    tab.stop()
  })

  it('keeps polling every 60 s through a long outage', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tab = openTab({ locks: null, channel: null })
    await settle()

    await vi.advanceTimersByTimeAsync(60_000)
    expect(tab.fetchSummary).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(tab.fetchSummary).toHaveBeenCalledTimes(2)
    expect(tab.onSummary).toHaveBeenLastCalledWith(summary(9))
    tab.stop()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(tab.fetchSummary).toHaveBeenCalledTimes(2)
  })

  it('reports unavailable and neither streams nor polls again', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }))
    const tab = openTab({ locks: null, channel: null })
    await settle()
    expect(tab.onStatus).toHaveBeenLastCalledWith('unavailable')
    await vi.advanceTimersByTimeAsync(180_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(tab.fetchSummary).not.toHaveBeenCalled()
    tab.stop()
  })

  it('answers a stream 401 with one summary through the api client, then reopens the stream', async () => {
    let attempt = 0
    fetchMock.mockImplementation(async (_input, init) => {
      if (++attempt === 1) return new Response(null, { status: 401 })
      const stream = streamResponse(init?.signal)
      streams.push({ push: stream.push, signal: init?.signal })
      return stream.response
    })
    const tab = openTab({ locks: null, channel: null })
    await settle()
    expect(tab.fetchSummary).toHaveBeenCalledTimes(1)
    expect(tab.onSummary).toHaveBeenLastCalledWith(summary(9))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(tab.onStatus).toHaveBeenLastCalledWith('live')
    tab.stop()
  })

  it('backs off when the stream 401s again right after a refresh', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 401 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tab = openTab({ locks: null, channel: null })
    await settle()
    // the first 401 reopens at once; the second waits 1 s, the third 2 s
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(tab.fetchSummary).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    tab.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('aborts and releases the lock when another tab signs out', async () => {
    const locks = fakeLocks()
    const tab = openTab({ locks, channel: fakeChannels() })
    await settle()
    expect(locks.held()).toEqual(['wasichai-test.notifications.u1'])

    window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, oldValue: 'tok', newValue: null }))
    await settle()
    expect(streams[0].signal?.aborted).toBe(true)
    expect(locks.held()).toEqual([])
    tab.stop()
  })

  it('streams in every tab without navigator.locks', async () => {
    const channel = fakeChannels()
    const one = openTab({ locks: null, channel })
    const two = openTab({ locks: null, channel })
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    one.stop()
    two.stop()
  })

  it('streams in every tab without BroadcastChannel', async () => {
    const locks = fakeLocks()
    const one = openTab({ locks, channel: null })
    const two = openTab({ locks, channel: null })
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    one.stop()
    two.stop()
  })
})

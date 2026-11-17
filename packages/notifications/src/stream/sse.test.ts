import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationSummary } from '../types'
import { openSummaryStream } from './sse'

const encoder = new TextEncoder()

const SUMMARY: NotificationSummary = {
  kinds: {
    INFO: { active: 2, unread: 1, overdue: 0 },
    WARNING: { active: 0, unread: 0, overdue: 0 },
    ACTION: { active: 1, unread: 1, overdue: 1 }
  },
  latest: null
}

interface Feed {
  push: (text: string) => void
  end: () => void
  fail: (error: Error) => void
}

// a response whose body the test feeds by hand
function streamResponse(): { response: Response; feed: Feed } {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    }
  })
  return {
    response: new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    feed: {
      push: (text) => controller.enqueue(encoder.encode(text)),
      end: () => controller.close(),
      fail: (error) => controller.error(error)
    }
  }
}

const summaryEvent = (summary: NotificationSummary = SUMMARY) => `event:summary\ndata:${JSON.stringify(summary)}\n\n`

function setup(token: string | null = 'tok') {
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  const onSummary = vi.fn()
  const onStatus = vi.fn()
  const onUnauthorized = vi.fn()
  const abort = new AbortController()
  let current = token
  const options = {
    baseUrl: '/api',
    getToken: () => current,
    onSummary,
    onStatus,
    onUnauthorized,
    signal: abort.signal
  }
  return { fetchMock, onSummary, onStatus, onUnauthorized, abort, options, setToken: (t: string | null) => (current = t) }
}

describe('openSummaryStream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not fetch without a token', async () => {
    const t = setup(null)
    await openSummaryStream(t.options)
    expect(t.fetchMock).not.toHaveBeenCalled()
  })

  it('sends the token in a header only and parses events split across chunks', async () => {
    const t = setup()
    const { response, feed } = streamResponse()
    t.fetchMock.mockResolvedValueOnce(response)
    const done = openSummaryStream(t.options)
    await vi.advanceTimersByTimeAsync(0)

    const [url, init] = t.fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/me/notifications/stream')
    expect(init?.headers).toEqual({ Accept: 'text/event-stream', Authorization: 'Bearer tok' })
    expect(t.onStatus).toHaveBeenCalledWith('open')

    const text = summaryEvent()
    feed.push(text.slice(0, 20))
    await vi.advanceTimersByTimeAsync(0)
    expect(t.onSummary).not.toHaveBeenCalled()
    feed.push(text.slice(20))
    await vi.advanceTimersByTimeAsync(0)
    expect(t.onSummary).toHaveBeenCalledExactlyOnceWith(SUMMARY)

    t.abort.abort()
    await done
  })

  it('joins several data lines with a newline and ignores other events and bad JSON', async () => {
    const t = setup()
    const { response, feed } = streamResponse()
    t.fetchMock.mockResolvedValueOnce(response)
    const done = openSummaryStream(t.options)
    await vi.advanceTimersByTimeAsync(0)

    const json = JSON.stringify(SUMMARY, null, 1).split('\n')
    feed.push(`event: summary\r\n${json.map((line) => `data: ${line}`).join('\r\n')}\r\n\r\n`)
    feed.push('event: other\ndata: {"x":1}\n\n')
    feed.push('event: summary\ndata: {not json\n\n')
    await vi.advanceTimersByTimeAsync(0)
    expect(t.onSummary).toHaveBeenCalledExactlyOnceWith(SUMMARY)

    t.abort.abort()
    await done
  })

  it('keeps the watchdog quiet while heartbeats arrive and fires after 60 s of silence', async () => {
    const t = setup()
    const first = streamResponse()
    const second = streamResponse()
    t.fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)
    const done = openSummaryStream(t.options)
    await vi.advanceTimersByTimeAsync(0)

    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(25_000)
      first.feed.push(':ping\n\n')
    }
    expect(t.fetchMock).toHaveBeenCalledTimes(1)
    expect(t.onStatus).not.toHaveBeenCalledWith('retrying')

    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.onStatus).toHaveBeenCalledWith('retrying')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(t.fetchMock).toHaveBeenCalledTimes(2)

    t.abort.abort()
    await done
  })

  it('calls onUnauthorized once on 401 and stops', async () => {
    const t = setup()
    t.fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    await openSummaryStream(t.options)
    expect(t.onUnauthorized).toHaveBeenCalledTimes(1)
    expect(t.fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([403, 404])('reports unavailable on %i and stops', async (status) => {
    const t = setup()
    t.fetchMock.mockResolvedValue(new Response(null, { status }))
    await openSummaryStream(t.options)
    expect(t.onStatus).toHaveBeenCalledExactlyOnceWith('unavailable')
    expect(t.onUnauthorized).not.toHaveBeenCalled()
    expect(t.fetchMock).toHaveBeenCalledTimes(1)
  })

  it('backs off with full jitter capped at 30 s and resets after an event', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const t = setup()
    const timeouts = vi.spyOn(globalThis, 'setTimeout')
    t.fetchMock.mockResolvedValue(new Response(null, { status: 500 }))
    const done = openSummaryStream(t.options)

    const delays = () => timeouts.mock.calls.map(([, ms]) => ms as number).filter((ms) => ms !== 60_000)
    for (let i = 0; i < 8; i++) await vi.advanceTimersByTimeAsync(30_000)
    const seen = delays()
    expect(seen.length).toBeGreaterThanOrEqual(7)
    expect(Math.max(...seen)).toBeLessThanOrEqual(30_000)
    expect(seen[0]).toBeLessThanOrEqual(1_000)
    expect(seen[1]).toBeLessThanOrEqual(2_000)
    expect(seen[5]).toBeGreaterThan(20_000)

    // one event resets the counter: the next wait is back to at most 1 s
    const { response, feed } = streamResponse()
    t.fetchMock.mockReset()
    t.fetchMock.mockResolvedValueOnce(response).mockResolvedValue(new Response(null, { status: 500 }))
    await vi.advanceTimersByTimeAsync(30_000)
    feed.push(summaryEvent())
    await vi.advanceTimersByTimeAsync(0)
    expect(t.onSummary).toHaveBeenCalledTimes(1)
    timeouts.mockClear()
    feed.fail(new Error('dropped'))
    await vi.advanceTimersByTimeAsync(0)
    expect(delays().at(-1)).toBeLessThanOrEqual(1_000)

    t.abort.abort()
    await done
  })

  it('reconnects at once with the current token when the server completes the stream', async () => {
    const t = setup('old')
    const first = streamResponse()
    const second = streamResponse()
    t.fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)
    const done = openSummaryStream(t.options)
    await vi.advanceTimersByTimeAsync(0)
    first.feed.push(summaryEvent())
    await vi.advanceTimersByTimeAsync(0)

    t.setToken('fresh')
    first.feed.end()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.fetchMock).toHaveBeenCalledTimes(2)
    expect(t.fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer fresh' })
    expect(t.onStatus).not.toHaveBeenCalledWith('retrying')

    t.abort.abort()
    await done
  })

  it('stops retrying when aborted', async () => {
    const t = setup()
    t.fetchMock.mockResolvedValue(new Response(null, { status: 503 }))
    const done = openSummaryStream(t.options)
    await vi.advanceTimersByTimeAsync(0)
    expect(t.onStatus).toHaveBeenCalledWith('retrying')
    t.abort.abort()
    await done
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries when the server never answers the request', async () => {
    const t = setup()
    t.fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
    )
    const done = openSummaryStream(t.options)
    await vi.advanceTimersByTimeAsync(59_000)
    expect(t.onStatus).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(t.onStatus).toHaveBeenCalledWith('retrying')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(t.fetchMock).toHaveBeenCalledTimes(2)

    t.abort.abort()
    await done
  })

  it('treats a failing getToken as a failed attempt', async () => {
    const t = setup()
    const getToken = vi.fn().mockRejectedValueOnce(new Error('refresh failed')).mockResolvedValue('tok')
    const { response } = streamResponse()
    t.fetchMock.mockResolvedValueOnce(response)
    const done = openSummaryStream({ ...t.options, getToken })
    await vi.advanceTimersByTimeAsync(0)
    expect(t.onStatus).toHaveBeenCalledWith('retrying')
    expect(t.fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(t.fetchMock).toHaveBeenCalledTimes(1)

    t.abort.abort()
    await done
  })
})

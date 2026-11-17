import type { NotificationSummary } from '../types'

export type StreamStatus = 'open' | 'retrying' | 'unavailable'

export interface SummaryStreamOptions {
  // the API root, e.g. "/api"
  baseUrl: string
  getToken: () => string | null | Promise<string | null>
  onSummary: (summary: NotificationSummary) => void
  onStatus: (status: StreamStatus) => void
  onUnauthorized: () => void
  signal?: AbortSignal
}

// two missed 25 s heartbeats
const WATCHDOG_MS = 60_000
const BACKOFF_BASE_MS = 1_000
const BACKOFF_CAP_MS = 30_000

// full jitter: a crowd of tabs reconnecting after an outage must not move in step
function backoff(attempt: number): number {
  return Math.random() * Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const finish = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, ms)
    signal?.addEventListener('abort', finish)
  })
}

// EventSource cannot send an Authorization header, and the token must never travel in a URL: hence fetch
export async function openSummaryStream(options: SummaryStreamOptions): Promise<void> {
  const { baseUrl, getToken, onSummary, onStatus, onUnauthorized, signal } = options
  let attempt = 0

  while (!signal?.aborted) {
    const token = await getToken()
    if (!token || signal?.aborted) return

    const controller = new AbortController()
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    // cancelling the reader as well ends a pending read even when the body ignores the request's signal
    const abort = () => {
      controller.abort()
      reader?.cancel().catch(() => {})
    }
    signal?.addEventListener('abort', abort)
    let watchdog: ReturnType<typeof setTimeout> | undefined
    let silent = false
    let received = false
    let completed = false

    try {
      const response = await fetch(`${baseUrl}/auth/me/notifications/stream`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
      if (response.status === 401) return onUnauthorized()
      // 404: the backend does not have the module; 403: a service account, not a person
      if (response.status === 403 || response.status === 404) return onStatus('unavailable')
      if (!response.ok || !response.body) throw new Error(`stream answered ${response.status}`)

      onStatus('open')
      reader = response.body.getReader()
      const arm = () => {
        clearTimeout(watchdog)
        watchdog = setTimeout(() => {
          silent = true
          abort()
        }, WATCHDOG_MS)
      }
      const decoder = new TextDecoder()
      let buffer = ''
      let event = ''
      let data: string[] = []

      const dispatch = () => {
        if (event === 'summary' && data.length > 0) {
          try {
            const summary = JSON.parse(data.join('\n')) as NotificationSummary
            received = true
            attempt = 0
            onSummary(summary)
          } catch {
            // a malformed event is dropped; the next one replaces it
          }
        }
        event = ''
        data = []
      }

      const line = (text: string) => {
        if (text === '') return dispatch()
        // a comment is a heartbeat
        if (text.startsWith(':')) return
        const colon = text.indexOf(':')
        const field = colon === -1 ? text : text.slice(0, colon)
        let value = colon === -1 ? '' : text.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'event') event = value
        else if (field === 'data') data.push(value)
      }

      arm()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        arm()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r\n|\n|\r/)
        buffer = lines.pop() ?? ''
        lines.forEach(line)
      }
      completed = !silent
    } catch {
      // network error or watchdog abort: fall through to the retry below
    } finally {
      clearTimeout(watchdog)
      signal?.removeEventListener('abort', abort)
    }

    if (signal?.aborted) return
    // the server ends a stream at the token's expiry: reconnect with the current token, no wait.
    // One that ends without ever sending an event counts as a failure, so it cannot spin
    if (completed && received) continue
    onStatus('retrying')
    await sleep(backoff(attempt), signal)
    attempt++
  }
}

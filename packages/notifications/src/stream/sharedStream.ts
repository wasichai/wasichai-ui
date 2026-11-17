import type { NotificationSummary } from '../types'
import { backoff, openSummaryStream, sleep } from './sse'

export type SummaryStatus = 'live' | 'polling' | 'unavailable'

// the parts of navigator.locks and BroadcastChannel used here, so tests can stand in two tabs
export interface LockManagerLike {
  request(name: string, options: { signal?: AbortSignal }, callback: () => Promise<void>): Promise<unknown>
}

export interface ChannelLike {
  postMessage(message: ChannelMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  close(): void
}

export type ChannelMessage =
  { type: 'hello' } | { type: 'summary'; userId: string; summary: NotificationSummary } | { type: 'status'; userId: string; status: SummaryStatus }

export interface SharedStreamOptions {
  // config.storagePrefix: the lock and the channel are `<prefix>.notifications.<userId>`
  prefix: string
  userId: string
  baseUrl: string
  getToken: () => string | null | Promise<string | null>
  // its removal in another tab is a sign-out
  tokenKey: string
  // through core's client: the floor while the stream retries, and the token refresh after a stream 401
  fetchSummary: () => Promise<NotificationSummary>
  onSummary: (summary: NotificationSummary) => void
  onStatus: (status: SummaryStatus) => void
  // undefined = the browser's; null = none, so this tab leads alone
  locks?: LockManagerLike | null
  channel?: ((name: string) => ChannelLike) | null
}

const POLL_MS = 60_000

function browserLocks(): LockManagerLike | null {
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null
}

function browserChannel(): ((name: string) => ChannelLike) | null {
  return typeof BroadcastChannel === 'undefined' ? null : (name) => new BroadcastChannel(name)
}

// one stream per browser: the tab holding the lock streams and tells the others. returns stop()
export function startSharedStream(options: SharedStreamOptions): () => void {
  const { userId, tokenKey, onSummary, onStatus } = options
  // per user: a tab of another session never waits behind this one's leader
  const name = `${options.prefix}.notifications.${userId}`
  const locks = options.locks === undefined ? browserLocks() : options.locks
  const makeChannel = options.channel === undefined ? browserChannel() : options.channel
  // sharing needs both: without a lock tabs cannot pick one leader, without a channel a follower never hears
  const channel = locks && makeChannel ? makeChannel(name) : null
  const stopped = new AbortController()
  let leading = false
  let last: NotificationSummary | undefined
  let status: SummaryStatus | undefined

  const applySummary = (summary: NotificationSummary) => {
    last = summary
    onSummary(summary)
  }
  const applyStatus = (next: SummaryStatus) => {
    status = next
    onStatus(next)
  }

  channel?.addEventListener('message', (event) => {
    const message = event.data as ChannelMessage
    if (message.type === 'hello') {
      if (!leading) return
      if (last) channel.postMessage({ type: 'summary', userId, summary: last })
      if (status) channel.postMessage({ type: 'status', userId, status })
      return
    }
    // a summary of someone else (a stale tab of another session) is not ours to show
    if (leading || message.userId !== userId) return
    if (message.type === 'summary') applySummary(message.summary)
    else if (message.type === 'status') applyStatus(message.status)
  })

  async function lead(): Promise<void> {
    leading = true
    let poll: ReturnType<typeof setInterval> | undefined
    const stopPolling = () => {
      clearInterval(poll)
      poll = undefined
    }
    const publishSummary = (summary: NotificationSummary) => {
      applySummary(summary)
      channel?.postMessage({ type: 'summary', userId, summary })
    }
    const publishStatus = (next: SummaryStatus) => {
      if (next === status) return
      applyStatus(next)
      channel?.postMessage({ type: 'status', userId, status: next })
    }

    // stream 401s in a row; a summary off the stream ends the streak
    let refused = 0
    try {
      while (!stopped.signal.aborted) {
        let unauthorized = false
        await openSummaryStream({
          baseUrl: options.baseUrl,
          getToken: options.getToken,
          onUnauthorized: () => (unauthorized = true),
          signal: stopped.signal,
          onSummary: (summary) => {
            refused = 0
            publishSummary(summary)
          },
          onStatus: (stream) => {
            if (stream !== 'retrying') {
              stopPolling()
              return publishStatus(stream === 'open' ? 'live' : 'unavailable')
            }
            poll ??= setInterval(() => {
              options.fetchSummary().then(
                // an answer that lands after the stream reopened is older than the stream's
                (summary) => poll && !stopped.signal.aborted && publishSummary(summary),
                // the stream decides what a failure means; the next tick tries again
                () => {}
              )
            }, POLL_MS)
            publishStatus('polling')
          }
        })
        if (!unauthorized || stopped.signal.aborted) break
        // an access token lives minutes: a 401 (or no token at all) is routine. core's client refreshes it on its own 401, or signs
        // out when the realm refuses (and then the provider stops us). never sign out from here
        try {
          const summary = await options.fetchSummary()
          if (!stopped.signal.aborted) publishSummary(summary)
        } catch {
          // a failed refresh: the backoff below keeps it from spinning
        }
        // a second refusal right after a refresh must not loop tightly
        if (refused++ > 0) await sleep(backoff(refused - 2), stopped.signal)
      }
      // unavailable (no module, or not a person): keep the lock so the waiting tabs do not try again
      if (!stopped.signal.aborted) await new Promise((resolve) => stopped.signal.addEventListener('abort', resolve))
    } finally {
      stopPolling()
      leading = false
    }
  }

  function stop() {
    if (stopped.signal.aborted) return
    stopped.abort()
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }

  // another tab signed out: its token is gone from storage (key null: storage cleared)
  function onStorage(event: StorageEvent) {
    if ((event.key === tokenKey || event.key === null) && event.newValue === null) stop()
  }
  window.addEventListener('storage', onStorage)

  if (locks && channel) {
    channel.postMessage({ type: 'hello' })
    // an abort while waiting rejects the request: nothing to do then
    locks.request(name, { signal: stopped.signal }, () => (stopped.signal.aborted ? Promise.resolve() : lead())).catch(() => {})
  } else {
    void lead()
  }
  return stop
}

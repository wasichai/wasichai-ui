export interface MockRoute {
  method?: string
  // a string matches the path without its query string; a RegExp is tested on path + query
  path: string | RegExp
  status?: number
  body?: unknown
}

export interface RecordedCall {
  method: string
  url: string
  // url minus the api base url
  path: string
  body: unknown
}

export interface FetchMock {
  calls: RecordedCall[]
  restore: () => void
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// swaps global fetch for a table of canned answers. first matching route wins. anything unmatched
// answers a 404 problem, so a test that forgot a route fails on it instead of hanging on the network.
export function mockFetch(routes: MockRoute[], options: { baseUrl?: string } = {}): FetchMock {
  const baseUrl = (options.baseUrl ?? '/api').replace(/\/+$/, '')
  const original = globalThis.fetch
  const calls: RecordedCall[] = []

  globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init.method ?? 'GET').toUpperCase()
    const path = url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url
    const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : null
    calls.push({ method, url, path, body })

    const bare = path.split('?')[0]
    const route = routes.find(
      (candidate) =>
        (candidate.method ?? 'GET').toUpperCase() === method && (typeof candidate.path === 'string' ? candidate.path === bare : candidate.path.test(path))
    )
    if (!route) return jsonResponse({ title: 'Not Found', detail: `no mock for ${method} ${path}` }, 404)
    if (route.status === 204) return new Response(null, { status: 204 })
    return jsonResponse(route.body ?? null, route.status ?? 200)
  }

  return {
    calls,
    restore: () => {
      globalThis.fetch = original
    }
  }
}

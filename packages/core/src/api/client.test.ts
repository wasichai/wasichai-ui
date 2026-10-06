import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, createApiClient, describeError, getActiveApiClient, setActiveApiClient } from './client'

function answer(status: number, body?: unknown) {
  return vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }))
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('createApiClient', () => {
  it('joins the base url and the path without doubling the slash', async () => {
    const fetch = answer(200, { ok: true })
    vi.stubGlobal('fetch', fetch)
    await createApiClient({ baseUrl: 'https://host/api/', storagePrefix: 'a' }).request('/objects')
    expect(fetch).toHaveBeenCalledWith('https://host/api/objects', expect.anything())
  })

  it('sends the token of its own prefix only', async () => {
    const fetch = answer(200, {})
    vi.stubGlobal('fetch', fetch)
    createApiClient({ baseUrl: '/api', storagePrefix: 'a' }).setToken('token-a')

    await createApiClient({ baseUrl: '/api', storagePrefix: 'b' }).request('/objects')
    const headers = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Headers
    expect(headers.get('Authorization')).toBeNull()
    expect(localStorage.getItem('a.token')).toBe('token-a')
  })

  it('sends the bearer token and json content type', async () => {
    const fetch = answer(200, {})
    vi.stubGlobal('fetch', fetch)
    const client = createApiClient({ baseUrl: '/api', storagePrefix: 'a' })
    client.setToken('t1')
    await client.request('/objects', { method: 'POST', body: '{}' })
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer t1')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
  })

  it('turns problem+json into an ApiError with its violations', async () => {
    vi.stubGlobal('fetch', answer(400, { title: 'Bad Request', detail: 'Invalid record', errors: [{ field: 'codigo', message: 'required' }] }))
    const failure = createApiClient({ baseUrl: '/api', storagePrefix: 'a' }).request('/objects/x/records')
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 400, message: 'Invalid record', violations: [{ field: 'codigo', message: 'required' }] })
  })

  it('forgets only its own token on a 401', async () => {
    vi.stubGlobal('fetch', answer(401, { title: 'Unauthorized' }))
    const a = createApiClient({ baseUrl: '/api', storagePrefix: 'a' })
    const b = createApiClient({ baseUrl: '/api', storagePrefix: 'b' })
    a.setToken('token-a')
    b.setToken('token-b')
    await expect(a.request('/auth/me/permissions')).rejects.toMatchObject({ status: 401 })
    expect(a.getToken()).toBeNull()
    expect(b.getToken()).toBe('token-b')
  })

  // a proxy or gateway in front of the api answers in html or plain text: the status still counts
  it('turns an error page that is not json into an ApiError with its status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html><body>Bad Gateway</body></html>', { status: 502, statusText: 'Bad Gateway' }))
    )
    const failure = createApiClient({ baseUrl: '/api', storagePrefix: 'a' }).request('/objects')
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 502, message: 'Bad Gateway', violations: [] })
  })

  it('signs out on a 401 whose body is not json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }))
    )
    const client = createApiClient({ baseUrl: '/api', storagePrefix: 'a' })
    client.setToken('token-a')
    const handler = vi.fn()
    client.setOnUnauthorized(handler)

    await expect(client.request('/objects')).rejects.toMatchObject({ status: 401 })
    expect(client.getToken()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('answers undefined for a 204', async () => {
    vi.stubGlobal('fetch', answer(204))
    await expect(createApiClient({ baseUrl: '/api', storagePrefix: 'a' }).request('/objects/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('calls the registered onUnauthorized handler after a 401 clears the token', async () => {
    vi.stubGlobal('fetch', answer(401, { title: 'Unauthorized' }))
    const client = createApiClient({ baseUrl: '/api', storagePrefix: 'a' })
    client.setToken('token-a')
    const handler = vi.fn()
    client.setOnUnauthorized(handler)

    await expect(client.request('/auth/me/permissions')).rejects.toMatchObject({ status: 401 })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(client.getToken()).toBeNull()
  })

  it('is backward compatible: a 401 with no handler registered still just clears the token', async () => {
    vi.stubGlobal('fetch', answer(401, { title: 'Unauthorized' }))
    const client = createApiClient({ baseUrl: '/api', storagePrefix: 'a' })
    client.setToken('token-a')

    await expect(client.request('/auth/me/permissions')).rejects.toMatchObject({ status: 401 })
    expect(client.getToken()).toBeNull()
  })
})

describe('api()', () => {
  it('goes through whichever client is active', async () => {
    const fetch = answer(200, [])
    vi.stubGlobal('fetch', fetch)
    const previous = getActiveApiClient()
    setActiveApiClient(createApiClient({ baseUrl: '/other', storagePrefix: 'o' }))
    try {
      await api('/objects')
      expect(fetch).toHaveBeenCalledWith('/other/objects', expect.anything())
    } finally {
      setActiveApiClient(previous)
    }
  })
})

describe('describeError', () => {
  // the whole point of a refusal is the reason; losing it would leave the admin guessing
  it('keeps the field that a validation error names', () => {
    const error = new ApiError(400, 'Objects cannot be renamed', [{ field: 'name', message: 'the name backs the table' }])
    expect(describeError(error)).toBe('Objects cannot be renamed — name: the name backs the table')
  })

  it('keeps a conflict message that names no field', () => {
    expect(describeError(new ApiError(409, "Field 'revisado' is used by automation 'marca'"))).toBe("Field 'revisado' is used by automation 'marca'")
  })

  it('falls back to the raw cause when it is not an API error', () => {
    expect(describeError('network down')).toBe('network down')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock, type MockRoute } from '@wasichai/testing'
import { ApiError, createApiClient } from '../api/client'
import { fetchAuthConfig } from './authConfig'

const PREFIX = 'auth-config-test'

let fetch: FetchMock | null = null
beforeEach(() => localStorage.clear())
afterEach(() => {
  fetch?.restore()
  fetch = null
  localStorage.clear()
})

function answering(routes: MockRoute[]) {
  fetch = mockFetch(routes)
  return createApiClient({ baseUrl: '/api', storagePrefix: PREFIX })
}

describe('fetchAuthConfig', () => {
  it('reads local mode from GET /auth/config', async () => {
    const client = answering([{ path: '/auth/config', body: { mode: 'local' } }])
    await expect(fetchAuthConfig(client)).resolves.toEqual({ mode: 'local' })
    expect(fetch?.calls.map((call) => `${call.method} ${call.url}`)).toEqual(['GET /api/auth/config'])
  })

  it('reads oidc mode with its issuer and client', async () => {
    const config = { mode: 'oidc', issuer: 'https://sso/realms/x', clientId: 'web' }
    const client = answering([{ path: '/auth/config', body: config }])
    await expect(fetchAuthConfig(client)).resolves.toEqual(config)
  })

  it('never sends the stored local token: an expired one would get a 401 even on a public route', async () => {
    localStorage.setItem(`${PREFIX}.token`, 'stale-token')
    const client = answering([{ path: '/auth/config', body: { mode: 'local' } }])
    await expect(fetchAuthConfig(client)).resolves.toEqual({ mode: 'local' })
    expect(fetch?.calls[0].headers.authorization).toBeUndefined()
  })

  it('treats a 404 as local: an older backend has no route', async () => {
    const client = answering([])
    await expect(fetchAuthConfig(client)).resolves.toEqual({ mode: 'local' })
  })

  it('treats an anonymous 401 as local: on an older backend the route is not public', async () => {
    const client = answering([{ path: '/auth/config', status: 401, body: { title: 'Unauthorized' } }])
    const unauthorized = vi.fn()
    client.setOnUnauthorized(unauthorized)
    localStorage.setItem(`${PREFIX}.token`, 'kept')
    await expect(fetchAuthConfig(client)).resolves.toEqual({ mode: 'local' })
    // not the client's 401: nobody is signed out
    expect(unauthorized).not.toHaveBeenCalled()
    expect(localStorage.getItem(`${PREFIX}.token`)).toBe('kept')
  })

  it('rejects on any other failure', async () => {
    const client = answering([{ path: '/auth/config', status: 500, body: { title: 'boom' } }])
    const failure = fetchAuthConfig(client)
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 500, message: 'boom' })
  })

  it('rejects when the network fails', async () => {
    const client = answering([])
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    try {
      await expect(fetchAuthConfig(client)).rejects.toBeInstanceOf(TypeError)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { ApiError, createApiClient } from '@wasichai/core'
import { jsonResponse, mockFetch, type FetchMock } from './fetch'

let mock: FetchMock | null = null
afterEach(() => mock?.restore())

const client = createApiClient({ baseUrl: '/api', storagePrefix: 'fetch-test' })

describe('mockFetch', () => {
  it('answers a matching route with json and records the call', async () => {
    mock = mockFetch([{ method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }])
    await expect(client.request('/objects/predio/records', { method: 'POST', body: JSON.stringify({ attributes: { codigo: 'A' } }) })).resolves.toEqual({
      id: 'r1'
    })
    expect(mock.calls).toEqual([{ method: 'POST', url: '/api/objects/predio/records', path: '/objects/predio/records', body: { attributes: { codigo: 'A' } } }])
  })

  it('answers anything unmatched with a 404 problem so the test fails loudly', async () => {
    mock = mockFetch([])
    await expect(client.request('/objects')).rejects.toBeInstanceOf(ApiError)
    await expect(client.request('/objects')).rejects.toMatchObject({ status: 404, message: 'no mock for GET /objects' })
  })

  it('matches a string route on the path alone and a regexp on path plus query', async () => {
    mock = mockFetch([
      { path: '/objects/predio/records', body: { content: [] } },
      { path: /^\/audit\?.*operation=UPDATE/, body: [] }
    ])
    await expect(client.request('/objects/predio/records?page=0')).resolves.toEqual({ content: [] })
    await expect(client.request('/audit?limit=100&operation=UPDATE')).resolves.toEqual([])
  })

  it('answers 204 with no body', async () => {
    mock = mockFetch([{ method: 'DELETE', path: '/objects/predio', status: 204 }])
    await expect(client.request('/objects/predio', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('answers 401 by clearing the client token, same as a real server', async () => {
    client.setToken('secret')
    mock = mockFetch([{ path: '/objects', status: 401 }])
    await expect(client.request('/objects')).rejects.toBeInstanceOf(ApiError)
    await expect(client.request('/objects')).rejects.toMatchObject({ status: 401 })
    expect(client.getToken()).toBeNull()
  })

  it('puts the real fetch back', () => {
    const original = globalThis.fetch
    mockFetch([]).restore()
    expect(globalThis.fetch).toBe(original)
  })
})

describe('jsonResponse', () => {
  it('builds a json response with a status', async () => {
    const response = jsonResponse({ a: 1 }, 409)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ a: 1 })
  })
})

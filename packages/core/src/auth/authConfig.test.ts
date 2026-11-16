import { describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiClient } from '../api/client'
import { fetchAuthConfig } from './authConfig'

function clientAnswering(result: () => Promise<unknown>) {
  const request = vi.fn(result)
  return { client: { request } as unknown as ApiClient, request }
}

describe('fetchAuthConfig', () => {
  it('reads local mode', async () => {
    const { client, request } = clientAnswering(async () => ({ mode: 'local' }))
    await expect(fetchAuthConfig(client)).resolves.toEqual({ mode: 'local' })
    expect(request).toHaveBeenCalledWith('/auth/config')
  })

  it('reads oidc mode with its issuer and client', async () => {
    const config = { mode: 'oidc', issuer: 'https://sso/realms/x', clientId: 'web' }
    const { client } = clientAnswering(async () => config)
    await expect(fetchAuthConfig(client)).resolves.toEqual(config)
  })

  it('treats a 404 as local: an older backend has no route', async () => {
    const { client } = clientAnswering(async () => {
      throw new ApiError(404, 'Not Found')
    })
    await expect(fetchAuthConfig(client)).resolves.toEqual({ mode: 'local' })
  })

  it('rejects on any other failure', async () => {
    const { client } = clientAnswering(async () => {
      throw new ApiError(500, 'boom')
    })
    await expect(fetchAuthConfig(client)).rejects.toMatchObject({ status: 500 })
  })
})

import { ApiError, type ApiClient } from '../api/client'

// how the backend wants users to sign in. oidc: the realm issues the token, the app never sees a password.
export type AuthConfig = { mode: 'local' } | { mode: 'oidc'; issuer: string; clientId: string }

// public route. an older backend has none (404): that one is local. any other failure must show, not pass as local.
export async function fetchAuthConfig(client: ApiClient): Promise<AuthConfig> {
  try {
    return await client.request<AuthConfig>('/auth/config')
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) return { mode: 'local' }
    throw cause
  }
}

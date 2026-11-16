import { ApiError, type ApiClient } from '../api/client'

// how the backend wants users to sign in. oidc: the realm issues the token, the app never sees a password.
export type AuthConfig = { mode: 'local' } | { mode: 'oidc'; issuer: string; clientId: string }

function problemMessage(text: string, response: Response): string {
  try {
    const body = JSON.parse(text) as { detail?: string; title?: string } | null
    if (body?.detail || body?.title) return (body.detail ?? body.title) as string
  } catch {
    // html or text from a proxy
  }
  return response.statusText || `HTTP ${response.status}`
}

// public route, asked anonymously and outside the client: a stale stored token would get a 401 even here,
// and that 401 must not sign anyone out. an older backend has no route (404) or keeps it private (401):
// that one is local. any other failure must show, not pass as local.
export async function fetchAuthConfig(client: ApiClient): Promise<AuthConfig> {
  const response = await fetch(`${client.baseUrl}/auth/config`, { headers: { Accept: 'application/json' } })
  if (response.status === 401 || response.status === 404) return { mode: 'local' }
  const text = await response.text()
  if (!response.ok) throw new ApiError(response.status, problemMessage(text, response))
  return JSON.parse(text) as AuthConfig
}

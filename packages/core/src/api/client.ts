import { DEFAULT_CONFIG, storageKeys, type StorageKeys } from '../app/config'

export interface FieldViolation {
  field: string
  message: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly violations: FieldViolation[] = []
  ) {
    super(message)
  }
}

export interface ApiClientOptions {
  baseUrl: string
  storagePrefix: string
}

export interface ApiClient {
  readonly baseUrl: string
  readonly keys: StorageKeys
  request<T>(path: string, init?: RequestInit): Promise<T>
  getToken(): string | null
  setToken(token: string | null): void
  // fires right after a 401 clears the token, so a signed-in caller (AuthProvider) can drop its own
  // state too. optional and additive: existing callers that never register one see no change.
  setOnUnauthorized(handler: (() => void) | null): void
}

export function createApiClient({ baseUrl, storagePrefix }: ApiClientOptions): ApiClient {
  const base = baseUrl.replace(/\/+$/, '')
  const keys = storageKeys(storagePrefix)
  let onUnauthorized: (() => void) | null = null

  const getToken = () => localStorage.getItem(keys.token)
  const setToken = (token: string | null) => {
    if (token) localStorage.setItem(keys.token, token)
    else localStorage.removeItem(keys.token)
  }
  const setOnUnauthorized = (handler: (() => void) | null) => {
    onUnauthorized = handler
  }

  // every call goes through here: bearer token in, problem+json out as ApiError.
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(`${base}${path}`, { ...init, headers })

    if (response.status === 204) return undefined as T
    const text = await response.text()
    const body = text ? JSON.parse(text) : null

    if (!response.ok) {
      if (response.status === 401) {
        setToken(null)
        onUnauthorized?.()
      }
      throw new ApiError(response.status, body?.detail ?? body?.title ?? response.statusText, body?.errors ?? [])
    }
    return body as T
  }

  return { baseUrl: base, keys, request, getToken, setToken, setOnUnauthorized }
}

// one app per page. WasichaiProviders makes its client the active one before any child renders,
// so hooks and module code keep calling plain api().
let active: ApiClient = createApiClient({ baseUrl: DEFAULT_CONFIG.apiBaseUrl, storagePrefix: DEFAULT_CONFIG.storagePrefix })

export function setActiveApiClient(client: ApiClient): void {
  active = client
}

export function getActiveApiClient(): ApiClient {
  return active
}

export function api<T>(path: string, init?: RequestInit): Promise<T> {
  return active.request<T>(path, init)
}

export function getToken(): string | null {
  return active.getToken()
}

export function setToken(token: string | null): void {
  active.setToken(token)
}

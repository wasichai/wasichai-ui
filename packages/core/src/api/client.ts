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

// a refusal names the field or the rule that blocked it. flattening it keeps that name on screen.
export function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    return [cause.message, ...cause.violations.map((violation) => `${violation.field}: ${violation.message}`)].join(' — ')
  }
  return String(cause)
}

// a form draws each violation under its field and the message in its banner
export function formError(cause: unknown): { message: string; violations: FieldViolation[] } {
  if (cause instanceof ApiError) return { message: cause.message, violations: cause.violations }
  return { message: String(cause), violations: [] }
}

// problem+json, or nothing to read: a proxy or gateway in front of the api answers in html or
// text, and parsing that threw a SyntaxError before the status was even looked at (a 401 kept its token)
function readProblem(text: string): { detail?: string; title?: string; errors?: FieldViolation[] } | null {
  try {
    const body: unknown = text ? JSON.parse(text) : null
    return body !== null && typeof body === 'object' ? body : null
  } catch {
    return null
  }
}

// owns the token when the realm issues it (oidc session). refresh() true: get() now holds a fresh token.
export interface TokenSource {
  get(): string | null
  refresh(): Promise<boolean>
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
  // when set, the source replaces localStorage and a 401 gets one refresh and one retry before signing out
  setTokenSource(source: TokenSource | null): void
}

export function createApiClient({ baseUrl, storagePrefix }: ApiClientOptions): ApiClient {
  const base = baseUrl.replace(/\/+$/, '')
  const keys = storageKeys(storagePrefix)
  let onUnauthorized: (() => void) | null = null
  let source: TokenSource | null = null
  // one refresh at a time: concurrent 401s wait on the same promise
  let refreshing: Promise<boolean> | null = null

  const getToken = () => (source ? source.get() : localStorage.getItem(keys.token))
  const setToken = (token: string | null) => {
    // the source owns the token, storage stays untouched
    if (source) return
    if (token) localStorage.setItem(keys.token, token)
    else localStorage.removeItem(keys.token)
  }
  const setOnUnauthorized = (handler: (() => void) | null) => {
    onUnauthorized = handler
  }

  const setTokenSource = (next: TokenSource | null) => {
    source = next
    refreshing = null
  }

  function refresh(current: TokenSource): Promise<boolean> {
    if (!refreshing) {
      const attempt = current.refresh().catch(() => false)
      const settled = attempt.finally(() => {
        if (refreshing === settled) refreshing = null
      })
      refreshing = settled
    }
    return refreshing
  }

  // every call goes through here: bearer token in, problem+json out as ApiError.
  async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(`${base}${path}`, { ...init, headers })

    if (response.status === 204) return undefined as T
    const text = await response.text()

    if (!response.ok) {
      if (response.status === 401 && source && !retried && (await refresh(source))) {
        // a second 401 after a good refresh is final: no loop
        return request<T>(path, init, true)
      }
      if (response.status === 401) {
        setToken(null)
        onUnauthorized?.()
      }
      const problem = readProblem(text)
      // http/2 sends no status text: an html 502 behind a proxy would read as an empty error
      throw new ApiError(response.status, problem?.detail ?? problem?.title ?? (response.statusText || `HTTP ${response.status}`), problem?.errors ?? [])
    }
    return (text ? JSON.parse(text) : null) as T
  }

  return { baseUrl: base, keys, request: (path, init) => request(path, init), getToken, setToken, setOnUnauthorized, setTokenSource }
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

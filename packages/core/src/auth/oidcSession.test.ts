import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOidcSession } from './oidcSession'

type Handler = (arg?: unknown) => void

// fake UserManager: captures the settings, keeps event handlers so a test can fire them
const fake = vi.hoisted(() => {
  const state = {
    settings: undefined as Record<string, unknown> | undefined,
    handlers: {} as Record<string, Handler[]>,
    getUser: vi.fn(),
    signinRedirect: vi.fn(),
    signinCallback: vi.fn(),
    signinSilent: vi.fn(),
    signoutRedirect: vi.fn(),
    fire(name: string, arg?: unknown) {
      for (const handler of state.handlers[name] ?? []) handler(arg)
    }
  }
  const on = (name: string) => (handler: Handler) => {
    ;(state.handlers[name] ??= []).push(handler)
  }
  class UserManager {
    events = {
      addUserLoaded: on('userLoaded'),
      addUserUnloaded: on('userUnloaded'),
      addSilentRenewError: on('silentRenewError'),
      addAccessTokenExpired: on('accessTokenExpired')
    }
    constructor(settings: Record<string, unknown>) {
      state.settings = settings
    }
    getUser = state.getUser
    signinRedirect = state.signinRedirect
    signinCallback = state.signinCallback
    signinSilent = state.signinSilent
    signoutRedirect = state.signoutRedirect
  }
  class WebStorageStateStore {
    constructor(public options: { store: Storage }) {}
  }
  return { state, UserManager, WebStorageStateStore }
})

vi.mock('oidc-client-ts', () => ({ UserManager: fake.UserManager, WebStorageStateStore: fake.WebStorageStateStore }))

const base = { issuer: 'https://id.test/realms/w', clientId: 'web' }
const future = () => Math.floor(Date.now() / 1000) + 300
const user = (over: Record<string, unknown> = {}) => ({
  access_token: 'tok-1',
  expires_at: future(),
  profile: { name: 'Ana' },
  ...over
})
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createOidcSession', () => {
  beforeEach(() => {
    fake.state.handlers = {}
    fake.state.settings = undefined
    fake.state.getUser.mockReset().mockResolvedValue(null)
    fake.state.signinRedirect.mockReset().mockResolvedValue(undefined)
    fake.state.signinCallback.mockReset()
    fake.state.signinSilent.mockReset()
    fake.state.signoutRedirect.mockReset().mockResolvedValue(undefined)
  })

  it('configures the code flow from the issuer, client and base path', () => {
    createOidcSession({ ...base, basePath: '/app' })
    const s = fake.state.settings as Record<string, any>
    expect(s.authority).toBe('https://id.test/realms/w')
    expect(s.client_id).toBe('web')
    expect(s.redirect_uri).toBe(`${window.location.origin}/app/auth/callback`)
    expect(s.post_logout_redirect_uri).toBe(`${window.location.origin}/app/`)
    expect(s.response_type).toBe('code')
    expect(s.scope).toBe('openid organization')
    expect(s.automaticSilentRenew).toBe(true)
    expect(s.userStore.options.store).toBe(sessionStorage)
    expect(s.stateStore.options.store).toBe(sessionStorage)
  })

  it.each([
    ['', '/auth/callback', '/'],
    ['/', '/auth/callback', '/'],
    ['/app/', '/app/auth/callback', '/app/']
  ])('normalises the base path %j', (basePath, callback, home) => {
    createOidcSession({ ...base, basePath })
    const s = fake.state.settings as Record<string, string>
    expect(s.redirect_uri).toBe(window.location.origin + callback)
    expect(s.post_logout_redirect_uri).toBe(window.location.origin + home)
  })

  it('uses the given storage', () => {
    const storage = {} as Storage
    createOidcSession({ ...base, basePath: '', storage })
    const s = fake.state.settings as Record<string, any>
    expect(s.userStore.options.store).toBe(storage)
    expect(s.stateStore.options.store).toBe(storage)
  })

  it('signIn redirects with returnTo as state, completeSignIn gives it back', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    await session.signIn('/records?x=1')
    expect(fake.state.signinRedirect).toHaveBeenCalledWith({ state: '/records?x=1' })
    fake.state.signinCallback.mockResolvedValue(user({ state: '/records?x=1' }))
    await expect(session.completeSignIn()).resolves.toEqual({ returnTo: '/records?x=1' })
  })

  it('completeSignIn falls back to / without state', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    fake.state.signinCallback.mockResolvedValue(user())
    await expect(session.completeSignIn()).resolves.toEqual({ returnTo: '/' })
  })

  it('current reads the stored user and feeds the token cache', async () => {
    fake.state.getUser.mockResolvedValue(user())
    const session = createOidcSession({ ...base, basePath: '' })
    await expect(session.current()).resolves.toEqual({ accessToken: 'tok-1', name: 'Ana' })
    expect(session.tokenSource.get()).toBe('tok-1')
  })

  it('current is null without a user or with an expired one', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    await expect(session.current()).resolves.toBeNull()
    fake.state.getUser.mockResolvedValue(user({ expires_at: 1 }))
    await expect(session.current()).resolves.toBeNull()
    expect(session.tokenSource.get()).toBeNull()
  })

  it('tokenSource.get follows userLoaded and userUnloaded', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    expect(session.tokenSource.get()).toBeNull()
    fake.state.fire('userLoaded', user({ access_token: 'tok-2' }))
    expect(session.tokenSource.get()).toBe('tok-2')
    fake.state.fire('userLoaded', user({ expires_at: 1 }))
    expect(session.tokenSource.get()).toBeNull()
    fake.state.fire('userLoaded', user())
    fake.state.fire('userUnloaded')
    expect(session.tokenSource.get()).toBeNull()
  })

  it('tokenSource.get picks up the user read at start', async () => {
    fake.state.getUser.mockResolvedValue(user({ access_token: 'tok-3' }))
    const session = createOidcSession({ ...base, basePath: '' })
    await flush()
    expect(session.tokenSource.get()).toBe('tok-3')
  })

  it('refresh is true when the silent renew gives a user', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    fake.state.signinSilent.mockResolvedValue(user({ access_token: 'tok-4' }))
    await expect(session.tokenSource.refresh()).resolves.toBe(true)
    expect(session.tokenSource.get()).toBe('tok-4')
  })

  it('refresh is false and expires the session when no user comes back', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    const expired = vi.fn()
    session.onExpired(expired)
    fake.state.signinSilent.mockResolvedValue(null)
    await expect(session.tokenSource.refresh()).resolves.toBe(false)
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('refresh is false and expires the session when the silent renew throws', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    const expired = vi.fn()
    session.onExpired(expired)
    fake.state.signinSilent.mockRejectedValue(new Error('invalid_grant'))
    await expect(session.tokenSource.refresh()).resolves.toBe(false)
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('fires onExpired on a failed silent renew and on an expired access token', () => {
    const session = createOidcSession({ ...base, basePath: '' })
    const expired = vi.fn()
    session.onExpired(expired)
    fake.state.fire('silentRenewError', new Error('x'))
    fake.state.fire('accessTokenExpired')
    expect(expired).toHaveBeenCalledTimes(2)
  })

  it('does not throw on expiry without a handler', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    expect(() => fake.state.fire('silentRenewError', new Error('x'))).not.toThrow()
    expect(() => fake.state.fire('accessTokenExpired')).not.toThrow()
    fake.state.signinSilent.mockResolvedValue(null)
    await expect(session.tokenSource.refresh()).resolves.toBe(false)
  })

  it('signOut is an RP-initiated redirect', async () => {
    const session = createOidcSession({ ...base, basePath: '' })
    await session.signOut()
    expect(fake.state.signoutRedirect).toHaveBeenCalledTimes(1)
  })
})

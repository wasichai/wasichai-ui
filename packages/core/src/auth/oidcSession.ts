import { ErrorTimeout, UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'
import type { TokenSource } from '../api/client'

export interface OidcSessionConfig {
  issuer: string
  clientId: string
  // router basename: '', '/' or '/app/' all work
  basePath: string
  storage?: Storage
}

export interface OidcSession {
  signIn(returnTo: string): Promise<void>
  completeSignIn(): Promise<{ returnTo: string }>
  // ends the realm session too (RP-initiated logout): every app of the domain signs out
  signOut(): Promise<void>
  // forgets this tab's user only; the realm session, if alive, brings it back silently on the next sign in
  signOutLocally(): Promise<void>
  current(): Promise<{ accessToken: string; name?: string } | null>
  tokenSource: TokenSource
  // the realm refused the refresh (or there was none to try). a network failure is not an expiry
  onExpired(handler: () => void): void
}

// the session lives in the tab (sessionStorage), never in localStorage
export function createOidcSession({ issuer, clientId, basePath, storage }: OidcSessionConfig): OidcSession {
  const base = basePath.replace(/^\/+|\/+$/g, '')
  const root = window.location.origin + (base ? `/${base}` : '')
  const store = new WebStorageStateStore({ store: storage ?? sessionStorage })
  const manager = new UserManager({
    authority: issuer,
    client_id: clientId,
    redirect_uri: `${root}/auth/callback`,
    post_logout_redirect_uri: `${root}/`,
    response_type: 'code',
    scope: 'openid organization',
    // renewal is ours: one refresh at a time, the realm rotates refresh tokens
    automaticSilentRenew: false,
    userStore: store,
    stateStore: store
  })

  // get() is sync: keep the user in memory, fed by the manager's events
  let cached: User | null = null
  let handler: (() => void) | null = null
  const alive = (user: User | null | undefined): User | null => (user && (user.expires_at === undefined || user.expires_at * 1000 > Date.now()) ? user : null)
  const keep = (user: User | null | undefined) => {
    cached = alive(user)
  }
  const expire = () => handler?.()

  manager.events.addUserLoaded(keep)
  manager.events.addUserUnloaded(() => {
    cached = null
  })
  // expired (reload after sleep) may still have a valid refresh token: try it, expire only when it fails
  manager.events.addAccessTokenExpiring(() => void refresh())
  manager.events.addAccessTokenExpired(() => void refresh())
  // a storage failure here only means no session yet
  void manager.getUser().then(keep, () => undefined)

  // one in flight for every caller (expiring timer, 401, expired, current): a rotated refresh token works once
  let inflight: Promise<boolean> | null = null
  const renew = async (): Promise<boolean> => {
    try {
      const user = alive(await manager.signinSilent())
      if (user) {
        cached = user
        return true
      }
    } catch (cause) {
      // offline after sleep, realm unreachable: keep the user, the next timer or 401 tries again
      if (cause instanceof TypeError || cause instanceof ErrorTimeout) return false
      // ErrorResponse (invalid_grant...) and the rest: the session is over
    }
    expire()
    return false
  }
  function refresh(): Promise<boolean> {
    if (!inflight) {
      const attempt = renew().finally(() => {
        if (inflight === attempt) inflight = null
      })
      inflight = attempt
    }
    return inflight
  }

  return {
    signIn: (returnTo) => manager.signinRedirect({ state: returnTo }),
    async completeSignIn() {
      const user = await manager.signinCallback()
      keep(user)
      return { returnTo: typeof user?.state === 'string' ? user.state : '/' }
    },
    signOut: () => manager.signoutRedirect(),
    async signOutLocally() {
      cached = null
      // a storage failure still leaves the token forgotten in memory
      await manager.removeUser().catch(() => undefined)
    },
    async current() {
      const stored = await manager.getUser()
      let user = alive(stored)
      // expired access token, live refresh token: renew before giving up
      if (!user && stored?.refresh_token && (await refresh())) user = cached
      cached = user
      return user ? { accessToken: user.access_token, name: user.profile?.name } : null
    },
    tokenSource: { get: () => alive(cached)?.access_token ?? null, refresh },
    onExpired(next) {
      handler = next
    }
  }
}

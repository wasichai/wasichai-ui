import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'
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
  signOut(): Promise<void>
  current(): Promise<{ accessToken: string; name?: string } | null>
  tokenSource: TokenSource
  // refresh failed or the session ended
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
    automaticSilentRenew: true,
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
  manager.events.addSilentRenewError(expire)
  manager.events.addAccessTokenExpired(expire)
  // a storage failure here only means no session yet
  void manager.getUser().then(keep, () => undefined)

  const refresh = async (): Promise<boolean> => {
    try {
      const user = alive(await manager.signinSilent())
      if (user) {
        cached = user
        return true
      }
    } catch {
      // counts as failed
    }
    expire()
    return false
  }

  return {
    signIn: (returnTo) => manager.signinRedirect({ state: returnTo }),
    async completeSignIn() {
      const user = await manager.signinCallback()
      keep(user)
      return { returnTo: typeof user?.state === 'string' ? user.state : '/' }
    },
    signOut: () => manager.signoutRedirect(),
    async current() {
      const user = alive(await manager.getUser())
      cached = user
      return user ? { accessToken: user.access_token, name: user.profile?.name } : null
    },
    tokenSource: { get: () => cached?.access_token ?? null, refresh },
    onExpired(next) {
      handler = next
    }
  }
}

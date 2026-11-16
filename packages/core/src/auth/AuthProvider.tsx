import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, type ApiClient } from '../api/client'
import { useApiClient, useWasichaiConfig } from '../app/context'
import { ErrorState, LoadingState } from '../components/query-state/QueryState'
import type { AuthUser, CallerPermissions } from '../types/auth'
import { AccessDenied } from './AccessDenied'
import type { AuthConfig } from './authConfig'
import { createOidcSession, type OidcSession } from './oidcSession'

interface LoginResponse {
  token: string
  expiresAt: string
  user: AuthUser
}

export type AuthMode = AuthConfig['mode']

export interface AuthContextValue {
  user: AuthUser | null
  // null while loading and when signed out. hiding by permission is a courtesy, the server decides
  permissions: CallerPermissions | null
  // set when the permissions fetch itself failed (network, 5xx). can() stays fail-closed either way
  permissionsError: ApiError | null
  isAdmin: boolean
  can: (objectName: string, action: string) => boolean
  // local: email and password. oidc: the realm asks, use signInWithRealm
  mode: AuthMode
  signIn: (email: string, password: string) => Promise<void>
  // oidc: leaves for the realm; the callback comes back to returnTo (a router path)
  signInWithRealm: (returnTo: string) => Promise<void>
  // oidc: ends the realm session too (every app of the domain). an expiry ends only this tab's
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// AuthCallbackPage's way in: finish the realm's sign in, load the user, answer returnTo. null outside oidc
const RealmCallbackContext = createContext<(() => Promise<string>) | null>(null)

const LOCAL: AuthConfig = { mode: 'local' }

function storedUser(key: string): AuthUser | null {
  const raw = localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

// the hook itself is always called (same order every render); only its QueryClientProvider
// ancestor is optional, so an embedder that mounts AuthProvider without one does not crash on sign-out
function useOptionalQueryClient(): QueryClient | undefined {
  try {
    return useQueryClient()
  } catch {
    return undefined
  }
}

export interface AuthProviderProps {
  children: ReactNode
  // tests and embedders: given means "use this", nothing is read from storage or fetched
  initialUser?: AuthUser | null
  initialPermissions?: CallerPermissions | null
  // what /auth/config said. default local
  authConfig?: AuthConfig
}

export function AuthProvider({ authConfig = LOCAL, ...props }: AuthProviderProps) {
  return authConfig.mode === 'oidc' ? <OidcAuthProvider realm={authConfig}>{props.children}</OidcAuthProvider> : <LocalAuthProvider {...props} />
}

interface Actions {
  mode: AuthMode
  signIn: AuthContextValue['signIn']
  signInWithRealm: AuthContextValue['signInWithRealm']
  signOut: AuthContextValue['signOut']
}

// both modes: permissions follow the user
function useAuthValue(user: AuthUser | null, initialPermissions: CallerPermissions | null | undefined, actions: Actions): AuthContextValue {
  const client = useApiClient()
  const loaded = useQuery<CallerPermissions, ApiError>({
    queryKey: ['auth', 'permissions', user?.id ?? null],
    queryFn: () => client.request<CallerPermissions>('/auth/me/permissions'),
    enabled: user !== null && initialPermissions === undefined
  })
  const permissions = initialPermissions !== undefined ? initialPermissions : user ? (loaded.data ?? null) : null
  const permissionsError = initialPermissions !== undefined || !user ? null : (loaded.error ?? null)
  const { mode, signIn, signInWithRealm, signOut } = actions

  return useMemo<AuthContextValue>(() => {
    const isAdmin = permissions?.admin === true
    return {
      user,
      permissions,
      permissionsError,
      isAdmin,
      can: (objectName, action) => isAdmin || (permissions?.objects[objectName] ?? []).includes(action),
      mode,
      signIn,
      signInWithRealm,
      signOut
    }
  }, [user, permissions, permissionsError, mode, signIn, signInWithRealm, signOut])
}

const noRealm = () => Promise.reject(new Error('wasichai: signInWithRealm needs oidc mode'))

function LocalAuthProvider({ children, initialUser, initialPermissions }: Omit<AuthProviderProps, 'authConfig'>) {
  const client = useApiClient()
  const queryClient = useOptionalQueryClient()
  const [user, setUser] = useState<AuthUser | null>(() => (initialUser !== undefined ? initialUser : storedUser(client.keys.user)))

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await client.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      client.setToken(response.token)
      localStorage.setItem(client.keys.user, JSON.stringify(response.user))
      setUser(response.user)
    },
    [client]
  )

  const signOut = useCallback(() => {
    client.setToken(null)
    localStorage.removeItem(client.keys.user)
    setUser(null)
    queryClient?.clear()
  }, [client, queryClient])

  // a 401 on ANY call (not just ours) means the session died server-side. without this the token is
  // gone but `user` lingers, leaving a zombie session: the UI still looks signed in while can() is
  // already false. the auth gate (outside this package) sees user go null and redirects to login.
  useEffect(() => {
    client.setOnUnauthorized(signOut)
    return () => client.setOnUnauthorized(null)
  }, [client, signOut])

  const value = useAuthValue(user, initialPermissions, { mode: 'local', signIn, signInWithRealm: noRealm, signOut })
  return <AuthContext value={value}>{children}</AuthContext>
}

// GET /auth/me: the app's user, not the realm's (no display name here, the realm has it)
interface Me {
  userId: string
  organizationId: string
  email: string
  roles: string[]
  serviceAccount?: boolean
}

type RealmState =
  | { phase: 'loading' }
  | { phase: 'ready'; user: AuthUser | null }
  // the backend's 403: signed in at the realm, not let into the app
  | { phase: 'denied'; detail: string }
  | { phase: 'failed'; error: unknown }

// one session per app, made outside render state: two would each renew against a refresh token the realm rotates.
// keyed by the client because the client is the app (WasichaiApp makes one)
const sessions = new WeakMap<ApiClient, OidcSession>()

function realmSession(client: ApiClient, realm: Extract<AuthConfig, { mode: 'oidc' }>, basePath: string): OidcSession {
  let session = sessions.get(client)
  if (!session) {
    session = createOidcSession({ issuer: realm.issuer, clientId: realm.clientId, basePath })
    // left by local mode before the switch: never sent again, never shown as the user
    localStorage.removeItem(client.keys.token)
    localStorage.removeItem(client.keys.user)
    // before any child asks anything
    client.setTokenSource(session.tokenSource)
    sessions.set(client, session)
  }
  return session
}

const noPassword = () => Promise.reject(new Error('wasichai: oidc signs in through the realm, use signInWithRealm'))

function OidcAuthProvider({ realm, children }: { realm: Extract<AuthConfig, { mode: 'oidc' }>; children: ReactNode }) {
  const client = useApiClient()
  const queryClient = useOptionalQueryClient()
  const { basename } = useWasichaiConfig()
  const session = realmSession(client, realm, basename ?? '')
  const [state, setState] = useState<RealmState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(async (): Promise<RealmState> => {
    try {
      const signedIn = await session.current()
      if (!signedIn) return { phase: 'ready', user: null }
      const me = await client.request<Me>('/auth/me')
      return {
        phase: 'ready',
        user: { id: me.userId, email: me.email, displayName: signedIn.name || me.email, organizationId: me.organizationId, roles: me.roles }
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) return { phase: 'denied', detail: cause.message }
      // a 401 already went through refresh and sign out
      if (cause instanceof ApiError && cause.status === 401) return { phase: 'ready', user: null }
      return { phase: 'failed', error: cause }
    }
  }, [client, session])

  useEffect(() => {
    let live = true
    void load().then((next) => {
      if (live) setState(next)
    })
    return () => {
      live = false
    }
  }, [load, attempt])

  // the code works once: strict mode's second effect, or a second caller, gets the same answer
  const completing = useRef<Promise<string> | null>(null)
  const complete = useCallback(() => {
    completing.current ??= (async () => {
      const { returnTo } = await session.completeSignIn()
      setState(await load())
      return returnTo
    })()
    return completing.current
  }, [load, session])

  // expiry or a final 401: only this tab forgets the user. the realm session may be alive (a duplicated tab
  // lost the rotation race, a short client idle): Ingresar then comes back without a password.
  // onExpired and a 401 often say the same thing: once, until someone signs in again
  const ending = useRef(false)
  const endHere = useCallback(() => {
    if (ending.current) return
    ending.current = true
    queryClient?.clear()
    void session.signOutLocally().finally(() => setState({ phase: 'ready', user: null }))
  }, [queryClient, session])
  useEffect(() => {
    if (state.phase === 'ready' && state.user) ending.current = false
  }, [state])

  // the button and AccessDenied: RP logout, every app of the domain. leave once
  const leaving = useRef(false)
  const signOut = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    queryClient?.clear()
    session.signOut().catch(() => {
      // realm unreachable: at least this tab forgets the user
      leaving.current = false
      setState({ phase: 'ready', user: null })
    })
  }, [queryClient, session])

  useEffect(() => {
    client.setOnUnauthorized(endHere)
    session.onExpired(endHere)
    return () => {
      client.setOnUnauthorized(null)
      session.onExpired(() => {})
    }
  }, [client, session, endHere])

  const signInWithRealm = useCallback((returnTo: string) => session.signIn(returnTo), [session])
  const user = state.phase === 'ready' ? state.user : null
  const value = useAuthValue(user, undefined, { mode: 'oidc', signIn: noPassword, signInWithRealm, signOut })

  let body: ReactNode = children
  if (state.phase === 'loading') body = <BootScreen>{<LoadingState />}</BootScreen>
  else if (state.phase === 'denied') body = <AccessDenied detail={state.detail} onSignOut={signOut} />
  else if (state.phase === 'failed')
    body = (
      <BootScreen>
        <ErrorState
          error={state.error}
          onRetry={() => {
            setState({ phase: 'loading' })
            setAttempt((count) => count + 1)
          }}
        />
      </BootScreen>
    )

  return (
    <AuthContext value={value}>
      <RealmCallbackContext value={complete}>{body}</RealmCallbackContext>
    </AuthContext>
  )
}

// before the app: nothing else on the page yet
export function BootScreen({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center bg-surface px-4">{children}</div>
}

export function useRealmCallback(): (() => Promise<string>) | null {
  return use(RealmCallbackContext)
}

// links read the session when there is one; a bare WasichaiContext (no AuthProvider) still gets links
export function useOptionalAuth(): AuthContextValue | null {
  return use(AuthContext)
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

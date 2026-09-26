import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { type ApiError } from '../api/client'
import { useApiClient } from '../app/context'
import type { AuthUser, CallerPermissions } from '../types/auth'

interface LoginResponse {
  token: string
  expiresAt: string
  user: AuthUser
}

export interface AuthContextValue {
  user: AuthUser | null
  // null while loading and when signed out. hiding by permission is a courtesy, the server decides
  permissions: CallerPermissions | null
  // set when the permissions fetch itself failed (network, 5xx). can() stays fail-closed either way
  permissionsError: ApiError | null
  isAdmin: boolean
  can: (objectName: string, action: string) => boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

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
}

export function AuthProvider({ children, initialUser, initialPermissions }: AuthProviderProps) {
  const client = useApiClient()
  const queryClient = useOptionalQueryClient()
  const [user, setUser] = useState<AuthUser | null>(() => (initialUser !== undefined ? initialUser : storedUser(client.keys.user)))
  const loaded = useQuery<CallerPermissions, ApiError>({
    queryKey: ['auth', 'permissions', user?.id ?? null],
    queryFn: () => client.request<CallerPermissions>('/auth/me/permissions'),
    enabled: user !== null && initialPermissions === undefined
  })
  const permissions = initialPermissions !== undefined ? initialPermissions : user ? (loaded.data ?? null) : null
  const permissionsError = initialPermissions !== undefined || !user ? null : (loaded.error ?? null)

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

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = permissions?.admin === true
    return {
      user,
      permissions,
      permissionsError,
      isAdmin,
      can: (objectName, action) => isAdmin || (permissions?.objects[objectName] ?? []).includes(action),
      signIn,
      signOut
    }
  }, [user, permissions, permissionsError, signIn, signOut])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

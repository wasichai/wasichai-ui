import { QueryClient } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../api/client'
import { resolveConfig } from '../app/config'
import { WasichaiProviders } from '../app/WasichaiProviders'
import { createWasichaiI18n } from '../i18n/createI18n'
import { createRegistry } from '../registry/createRegistry'
import type { AuthUser } from '../types/auth'
import { useAuth } from './AuthProvider'

const ana: AuthUser = { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'o1', roles: ['EDITOR'] }

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <p data-testid="user">{auth.user?.email ?? 'nobody'}</p>
      <p data-testid="rights">{`${auth.can('predio', 'READ')}/${auth.can('predio', 'DELETE')}/${auth.isAdmin}`}</p>
      <p data-testid="perm-error">{auth.permissionsError ? auth.permissionsError.message : 'none'}</p>
      <button onClick={() => void auth.signIn('ana@wasichai.test', 'secret')}>in</button>
      <button onClick={auth.signOut}>out</button>
    </div>
  )
}

function mount(children: ReactNode) {
  const config = resolveConfig({ storagePrefix: 'auth-test' })
  const apiClient = createApiClient({ baseUrl: config.apiBaseUrl, storagePrefix: config.storagePrefix })
  const registry = createRegistry([])
  const i18n = createWasichaiI18n({ languages: config.languages, storageKey: apiClient.keys.lang, modules: [] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <WasichaiProviders config={config} registry={registry} apiClient={apiClient} i18n={i18n} queryClient={queryClient}>
      {children}
    </WasichaiProviders>
  )
}

const fetch = vi.fn(async (url: string, _init?: RequestInit) => {
  if (url === '/api/auth/login') return new Response(JSON.stringify({ token: 'tok', expiresAt: '2026-12-31T00:00:00Z', user: ana }), { status: 200 })
  if (url === '/api/auth/me/permissions') return new Response(JSON.stringify({ admin: false, objects: { predio: ['READ', 'CREATE'] } }), { status: 200 })
  return new Response(null, { status: 404 })
})

beforeEach(() => {
  localStorage.clear()
  fetch.mockClear()
  vi.stubGlobal('fetch', fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('AuthProvider', () => {
  it('signs in, keeps token and user under its prefix, then loads the caller permissions', async () => {
    mount(<Probe />)
    expect(screen.getByTestId('user')).toHaveTextContent('nobody')

    await userEvent.click(screen.getByRole('button', { name: 'in' }))

    expect(await screen.findByText('ana@wasichai.test')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'ana@wasichai.test', password: 'secret' }) })
    )
    expect(localStorage.getItem('auth-test.token')).toBe('tok')
    expect(JSON.parse(localStorage.getItem('auth-test.user') ?? 'null')).toEqual(ana)
    await waitFor(() => expect(screen.getByTestId('rights')).toHaveTextContent('true/false/false'))
  })

  it('comes back signed in from its own prefix only', () => {
    localStorage.setItem('other.user', JSON.stringify(ana))
    mount(<Probe />)
    expect(screen.getByTestId('user')).toHaveTextContent('nobody')
  })

  it('forgets token and user on sign out', async () => {
    localStorage.setItem('auth-test.user', JSON.stringify(ana))
    localStorage.setItem('auth-test.token', 'tok')
    mount(<Probe />)
    expect(screen.getByTestId('user')).toHaveTextContent('ana@wasichai.test')

    await userEvent.click(screen.getByRole('button', { name: 'out' }))

    expect(screen.getByTestId('user')).toHaveTextContent('nobody')
    expect(localStorage.getItem('auth-test.token')).toBeNull()
    expect(localStorage.getItem('auth-test.user')).toBeNull()
  })

  it('refuses to be used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/useAuth must be used inside AuthProvider/)
  })

  it('signs out a zombie session when any api call comes back 401', async () => {
    localStorage.setItem('auth-test.user', JSON.stringify(ana))
    localStorage.setItem('auth-test.token', 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/auth/me/permissions') return new Response(JSON.stringify({ title: 'Unauthorized' }), { status: 401 })
        return new Response(null, { status: 404 })
      })
    )

    mount(<Probe />)
    expect(screen.getByTestId('user')).toHaveTextContent('ana@wasichai.test')

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('nobody'))
    expect(localStorage.getItem('auth-test.token')).toBeNull()
    expect(localStorage.getItem('auth-test.user')).toBeNull()
  })

  it('exposes a permissions fetch failure and stays fail-closed', async () => {
    localStorage.setItem('auth-test.user', JSON.stringify(ana))
    localStorage.setItem('auth-test.token', 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/auth/me/permissions') return new Response(JSON.stringify({ title: 'Server Error', detail: 'boom' }), { status: 500 })
        return new Response(null, { status: 404 })
      })
    )

    mount(<Probe />)

    await waitFor(() => expect(screen.getByTestId('perm-error')).not.toHaveTextContent('none'))
    expect(screen.getByTestId('rights')).toHaveTextContent('false/false/false')
    expect(screen.getByTestId('user')).toHaveTextContent('ana@wasichai.test')
  })
})

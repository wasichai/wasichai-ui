import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRealmSession, renderOidc, REALM, type FakeRealmSession, type RenderOidcResult } from '../test/oidc'
import { useAuth, useRealmCallback } from './AuthProvider'
import { createOidcSession } from './oidcSession'

vi.mock('./oidcSession', () => ({ createOidcSession: vi.fn() }))

const me = { userId: 'app-user-7', organizationId: 'o1', email: 'ana@wasichai.test', roles: ['EDITOR'] }
const permissions = { admin: false, objects: { predio: ['READ'] } }

function Probe() {
  const auth = useAuth()
  const complete = useRealmCallback()
  return (
    <div>
      <p data-testid="mode">{auth.mode}</p>
      <p data-testid="user">{auth.user ? `${auth.user.id}|${auth.user.displayName}|${auth.user.email}|${auth.user.organizationId}` : 'nobody'}</p>
      <p data-testid="rights">{`${auth.can('predio', 'READ')}`}</p>
      <button onClick={() => void auth.signInWithRealm('/plans/sheets')}>realm</button>
      <button onClick={auth.signOut}>out</button>
      <button onClick={() => void complete?.()}>callback</button>
    </div>
  )
}

let session: FakeRealmSession
let view: RenderOidcResult | null = null
beforeEach(() => {
  session = fakeRealmSession()
  vi.mocked(createOidcSession).mockReset()
  vi.mocked(createOidcSession).mockReturnValue(session)
})
afterEach(() => view?.fetch.restore())

describe('AuthProvider in oidc', () => {
  it('builds the user from /auth/me and the realm name, with the realm token on every call', async () => {
    view = renderOidc({
      ui: <Probe />,
      routes: [
        { path: '/auth/me', body: me },
        { path: '/auth/me/permissions', body: permissions }
      ]
    })

    expect(await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')).toBeInTheDocument()
    expect(screen.getByTestId('mode')).toHaveTextContent('oidc')
    await waitFor(() => expect(screen.getByTestId('rights')).toHaveTextContent('true'))
    expect(createOidcSession).toHaveBeenCalledWith({ issuer: REALM.issuer, clientId: REALM.clientId, basePath: '' })
    expect(view.apiClient.getToken()).toBe('realm-token')
    const meCall = view.fetch.calls.find((call) => call.path === '/auth/me')
    expect(meCall?.headers.authorization).toBe('Bearer realm-token')
    expect(localStorage.getItem('oidc-test.token')).toBeNull()
  })

  it('falls back to the email when the realm has no name', async () => {
    session = fakeRealmSession({ accessToken: 'realm-token' })
    vi.mocked(createOidcSession).mockReturnValue(session)
    view = renderOidc({ ui: <Probe />, routes: [{ path: '/auth/me', body: me }] })

    expect(await screen.findByText('app-user-7|ana@wasichai.test|ana@wasichai.test|o1')).toBeInTheDocument()
  })

  it('stays signed out without a realm session, and asks nothing', async () => {
    session = fakeRealmSession(null)
    vi.mocked(createOidcSession).mockReturnValue(session)
    view = renderOidc({ ui: <Probe /> })

    expect(await screen.findByText('nobody')).toBeInTheDocument()
    expect(view.fetch.calls.map((call) => call.path)).toEqual(['/auth/config'])
  })

  it('sends the sign in to the realm with where to come back', async () => {
    session = fakeRealmSession(null)
    vi.mocked(createOidcSession).mockReturnValue(session)
    view = renderOidc({ ui: <Probe /> })

    await userEvent.click(await screen.findByRole('button', { name: 'realm' }))

    expect(session.signIn).toHaveBeenCalledWith('/plans/sheets')
  })

  // a failed refresh (sleep, a duplicated tab, a short client idle) must not log out every app of the domain
  it("ends only this tab's session when the session expires, once even if a 401 says it too", async () => {
    view = renderOidc({
      ui: <Probe />,
      routes: [
        { path: '/auth/me', body: me },
        { path: '/gone', status: 401, body: { title: 'Unauthorized' } }
      ]
    })
    await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')
    const cleared = vi.spyOn(view.queryClient, 'clear')

    session.expire()
    await expect(view.apiClient.request('/gone')).rejects.toThrow()
    session.expire()

    expect(await screen.findByText('nobody')).toBeInTheDocument()
    expect(session.signOutLocally).toHaveBeenCalledTimes(1)
    expect(session.signOut).not.toHaveBeenCalled()
    expect(cleared).toHaveBeenCalledTimes(1)
    expect(session.tokenSource.refresh).toHaveBeenCalledTimes(1)
  })

  it("ends only this tab's session on a final 401", async () => {
    view = renderOidc({
      ui: <Probe />,
      routes: [
        { path: '/auth/me', body: me },
        { path: '/gone', status: 401, body: { title: 'Unauthorized' } }
      ]
    })
    await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')

    await expect(view.apiClient.request('/gone')).rejects.toThrow()

    expect(await screen.findByText('nobody')).toBeInTheDocument()
    expect(session.signOutLocally).toHaveBeenCalledTimes(1)
    expect(session.signOut).not.toHaveBeenCalled()
  })

  it('signs out locally again after signing back in', async () => {
    view = renderOidc({ ui: <Probe />, routes: [{ path: '/auth/me', body: me }] })
    await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')
    session.expire()
    expect(await screen.findByText('nobody')).toBeInTheDocument()

    // the realm session was alive: the sign in comes back without a password
    session.current.mockResolvedValue({ accessToken: 'realm-token-2', name: 'Ana Pérez' })
    session.completeSignIn.mockResolvedValue({ returnTo: '/' })
    await userEvent.click(screen.getByRole('button', { name: 'callback' }))
    expect(await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')).toBeInTheDocument()

    session.expire()
    expect(await screen.findByText('nobody')).toBeInTheDocument()
    expect(session.signOutLocally).toHaveBeenCalledTimes(2)
  })

  it('ends the realm session on sign out, once', async () => {
    view = renderOidc({ ui: <Probe />, routes: [{ path: '/auth/me', body: me }] })
    await userEvent.click(await screen.findByRole('button', { name: 'out' }))
    await userEvent.click(screen.getByRole('button', { name: 'out' }))

    expect(session.signOut).toHaveBeenCalledTimes(1)
    expect(session.signOutLocally).not.toHaveBeenCalled()
  })

  it('clears the stale local-mode credentials when the realm session starts', async () => {
    localStorage.setItem('oidc-test.token', 'old-local-token')
    localStorage.setItem('oidc-test.user', JSON.stringify({ id: 'u1' }))
    localStorage.setItem('oidc-test.lang', 'es')
    view = renderOidc({ ui: <Probe />, routes: [{ path: '/auth/me', body: me }] })
    await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')

    expect(localStorage.getItem('oidc-test.token')).toBeNull()
    expect(localStorage.getItem('oidc-test.user')).toBeNull()
    expect(localStorage.getItem('oidc-test.lang')).toBe('es')
    localStorage.removeItem('oidc-test.lang')
  })

  it('shows a denial on /auth/me with its reason and a way out', async () => {
    const detail = 'you have no access to this app; ask its administrator'
    view = renderOidc({ ui: <Probe />, routes: [{ path: '/auth/me', status: 403, body: { title: 'Forbidden', status: 403, detail } }] })

    expect(await screen.findByText(detail)).toBeInTheDocument()
    expect(screen.queryByTestId('user')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(session.signOut).toHaveBeenCalledTimes(1)
  })

  it('creates one realm session per app, strict mode or not', async () => {
    view = renderOidc({ ui: <Probe />, routes: [{ path: '/auth/me', body: me }], strict: true })

    await screen.findByText('app-user-7|Ana Pérez|ana@wasichai.test|o1')
    expect(createOidcSession).toHaveBeenCalledTimes(1)
  })
})

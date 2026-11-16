import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRealmSession, renderOidc, type FakeRealmSession, type RenderOidcResult } from '../test/oidc'
import { createOidcSession } from './oidcSession'

vi.mock('./oidcSession', () => ({ createOidcSession: vi.fn() }))

const me = { userId: 'app-user-7', organizationId: 'o1', email: 'ana@wasichai.test', roles: ['ADMIN'] }
const routes = [
  { path: '/auth/me', body: me },
  { path: '/auth/me/permissions', body: { admin: true, objects: {} } }
]

let session: FakeRealmSession
let view: RenderOidcResult | null = null
beforeEach(() => {
  session = fakeRealmSession(null)
  vi.mocked(createOidcSession).mockReset()
  vi.mocked(createOidcSession).mockReturnValue(session)
})
afterEach(() => view?.fetch.restore())

// what the realm does between the two: the session is there when the browser comes back
function signInAtRealm() {
  session.current.mockResolvedValue({ accessToken: 'realm-token', name: 'Ana Pérez' })
}

describe('AuthCallbackPage', () => {
  it('brings returnTo back from the realm: deep link, sign in, callback, deep link', async () => {
    view = renderOidc({ route: '/plans/sheets', routes })
    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(session.signIn).toHaveBeenCalledWith('/plans/sheets')
    view.unmount()
    view.fetch.restore()

    // the browser leaves for the realm and comes back to a fresh app on the callback
    signInAtRealm()
    view = renderOidc({ route: '/auth/callback?code=c&state=s', routes })

    expect(await screen.findByText('hojas del plano')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/plans\/sheets$/)
    expect(session.completeSignIn).toHaveBeenCalledTimes(1)
  })

  it('completes once under strict mode', async () => {
    await session.signIn('/plans/sheets')
    signInAtRealm()
    view = renderOidc({ route: '/auth/callback?code=c&state=s', routes, strict: true })

    expect(await screen.findByText('hojas del plano')).toBeInTheDocument()
    expect(session.completeSignIn).toHaveBeenCalledTimes(1)
  })

  it('goes home when returnTo is not one of ours', async () => {
    await session.signIn('//evil.test/phish')
    signInAtRealm()
    view = renderOidc({ route: '/auth/callback?code=c&state=s', routes: [...routes, { path: '/objects', body: [] }] })

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/))
  })

  // reloaded, or opened again: the code is spent. it must land on login with why, not loop
  it('lands on login with the reason when the code was already used', async () => {
    view = renderOidc({ route: '/auth/callback?code=used&state=s', routes })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar el ingreso')
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/login$/)
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(session.completeSignIn).toHaveBeenCalledTimes(1)
  })
})

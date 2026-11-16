import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRealmSession, renderOidc, type FakeRealmSession, type RenderOidcResult } from '../test/oidc'
import { createOidcSession } from './oidcSession'

vi.mock('./oidcSession', () => ({ createOidcSession: vi.fn() }))

let session: FakeRealmSession
let view: RenderOidcResult | null = null
beforeEach(() => {
  session = fakeRealmSession(null)
  vi.mocked(createOidcSession).mockReset()
  vi.mocked(createOidcSession).mockReturnValue(session)
})
afterEach(() => view?.fetch.restore())

describe('LoginPage in oidc', () => {
  it('offers one button to the realm and no fields', async () => {
    view = renderOidc({ route: '/login?returnTo=%2Fplans%2Fsheets' })

    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))

    expect(session.signIn).toHaveBeenCalledWith('/plans/sheets')
    expect(screen.queryByLabelText('Correo')).toBeNull()
    expect(screen.queryByLabelText('Contraseña')).toBeNull()
    expect(view.fetch.calls.map((call) => call.path)).not.toContain('/auth/login')
  })

  it('never sends the realm a return target that leaves the app', async () => {
    view = renderOidc({ route: '/login?returnTo=%2F%2Fevil.test' })

    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))

    expect(session.signIn).toHaveBeenCalledWith('/')
  })

  it('says so when the realm cannot be reached', async () => {
    session.signIn.mockRejectedValue(new Error('metadata unreachable'))
    view = renderOidc({ route: '/login' })

    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo contactar el servicio de ingreso')
  })

  it('sends a signed-out deep link to the realm button', async () => {
    view = renderOidc({ route: '/plans/sheets' })

    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/login?returnTo=%2Fplans%2Fsheets')
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { LoginPage } from './LoginPage'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('LoginPage', () => {
  // the reason appeared as plain text: a screen reader user heard nothing after pressing the button
  it('announces why the sign in was refused', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/auth/login', status: 401, body: { title: 'Unauthorized', detail: 'Invalid email or password' } }])
    renderWithProviders(<LoginPage />, { user: null, permissions: null })

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@wasichai.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})

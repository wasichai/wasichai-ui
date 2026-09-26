import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { useTheme } from '../theme/ThemeProvider'

let fetch: FetchMock | null = null
beforeEach(() => localStorage.clear())
afterEach(() => {
  fetch?.restore()
  delete document.documentElement.dataset.theme
})

function Probe() {
  const { preference, setPreference } = useTheme()
  return (
    <>
      <p>{`pref:${preference}`}</p>
      <button onClick={() => void setPreference('dark').catch(() => {})}>dark</button>
    </>
  )
}

describe('preferences', () => {
  it('the API value wins over the local copy and refreshes it', async () => {
    localStorage.setItem('wasichai-test.theme', 'light')
    fetch = mockFetch([{ path: '/auth/me/preferences', body: { theme: 'dark', locale: null } }])
    renderWithProviders(<Probe />)
    expect(await screen.findByText('pref:dark')).toBeInTheDocument()
    expect(localStorage.getItem('wasichai-test.theme')).toBe('dark')
  })

  it('saves a pick with PUT', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'system', locale: null } },
      { method: 'PUT', path: '/auth/me/preferences', body: { theme: 'dark', locale: null } }
    ])
    renderWithProviders(<Probe />)
    await screen.findByText('pref:system')
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    await waitFor(() => expect(fetch?.calls.find((call) => call.method === 'PUT')?.body).toEqual({ theme: 'dark' }))
    expect(screen.getByText('pref:dark')).toBeInTheDocument()
  })

  it('rolls back when the PUT fails', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'light', locale: null } },
      { method: 'PUT', path: '/auth/me/preferences', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } }
    ])
    renderWithProviders(<Probe />)
    await screen.findByText('pref:light')
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    await waitFor(() => expect(screen.getByText('pref:light')).toBeInTheDocument())
    expect(localStorage.getItem('wasichai-test.theme')).toBe('light')
  })

  it('a 404 keeps the preference in the browser', async () => {
    fetch = mockFetch([]) // unmocked routes answer 404, like a backend without the endpoint
    renderWithProviders(<Probe />)
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(await screen.findByText('pref:dark')).toBeInTheDocument()
    expect(fetch.calls.some((call) => call.method === 'PUT')).toBe(false)
    expect(localStorage.getItem('wasichai-test.theme')).toBe('dark')
  })

  it('applies a stored locale from the API', async () => {
    fetch = mockFetch([{ path: '/auth/me/preferences', body: { theme: 'system', locale: 'en' } }])
    renderWithProviders(<p>x</p>, { language: 'es' })
    await waitFor(() => expect(localStorage.getItem('wasichai-test.lang')).toBe('en'))
  })

  it('keyed by user: signed out, nothing is fetched', () => {
    fetch = mockFetch([])
    renderWithProviders(<Probe />, { user: null })
    expect(fetch.calls.some((call) => call.path === '/auth/me/preferences')).toBe(false)
  })
})

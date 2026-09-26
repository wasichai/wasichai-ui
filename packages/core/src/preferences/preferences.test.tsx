import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTranslation } from 'react-i18next'
import { jsonResponse, mockFetch, renderWithProviders, type FetchMock, type RecordedCall } from '@wasichai/testing'
import { useTheme } from '../theme/ThemeProvider'
import { usePreferences, useSetLocale } from './preferences'

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

// pending = the GET hasn't settled, none = it settled to a 404, loaded = it has a value
function preferencesStatus(data: unknown): string {
  return data === undefined ? 'pending' : data === null ? 'none' : 'loaded'
}

function LocaleProbe() {
  const { i18n } = useTranslation()
  const preferences = usePreferences()
  const setLocale = useSetLocale()
  return (
    <>
      <p>{`lang:${i18n.language}`}</p>
      <p>{`status:${preferencesStatus(preferences.data)}`}</p>
      <button onClick={() => void setLocale('en').catch(() => {})}>en</button>
    </>
  )
}

// stubs global fetch directly (not mockFetch) so the GET can be held open until the test says so
function deferredFetchStub(): { fetch: FetchMock; resolveGet: (body: unknown) => void } {
  const calls: RecordedCall[] = []
  let resolveGet: (response: Response) => void = () => {}
  const getPromise = new Promise<Response>((resolve) => {
    resolveGet = resolve
  })
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init.method ?? 'GET').toUpperCase()
    const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : null
    calls.push({ method, url, path: url.replace('/api', ''), body })
    if (method === 'GET') return getPromise
    if (method === 'PUT') return jsonResponse({ theme: 'dark', locale: null })
    return jsonResponse({ title: 'Not Found' }, 404)
  }) as typeof globalThis.fetch
  return {
    fetch: { calls, restore: () => (globalThis.fetch = original) },
    resolveGet: (body: unknown) => resolveGet(jsonResponse(body))
  }
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

  it('a pick made while the GET is pending is kept once it resolves', async () => {
    const deferred = deferredFetchStub()
    fetch = deferred.fetch
    renderWithProviders(<Probe />)
    expect(screen.getByText('pref:system')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    await waitFor(() => expect(fetch?.calls.find((call) => call.method === 'PUT')?.body).toEqual({ theme: 'dark' }))
    expect(screen.getByText('pref:dark')).toBeInTheDocument()

    // the slow GET finally settles with a stale value; the pick already sent must not be overwritten
    deferred.resolveGet({ theme: 'light', locale: null })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByText('pref:dark')).toBeInTheDocument()
  })

  it('applies a stored locale from the API', async () => {
    fetch = mockFetch([{ path: '/auth/me/preferences', body: { theme: 'system', locale: 'en' } }])
    renderWithProviders(<LocaleProbe />, { language: 'es' })
    await screen.findByText('status:loaded')
    expect(screen.getByText('lang:en')).toBeInTheDocument()
    expect(localStorage.getItem('wasichai-test.lang')).toBe('en')
  })

  it('ignores a stored locale the app does not offer', async () => {
    fetch = mockFetch([{ path: '/auth/me/preferences', body: { theme: 'system', locale: 'fr' } }])
    renderWithProviders(<LocaleProbe />, { language: 'es' })
    await screen.findByText('status:loaded')
    expect(screen.getByText('lang:es')).toBeInTheDocument()
    expect(localStorage.getItem('wasichai-test.lang')).toBe('es')
  })

  it('useSetLocale sends only the locale in the PUT body', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'system', locale: 'es' } },
      { method: 'PUT', path: '/auth/me/preferences', body: { theme: 'system', locale: 'en' } }
    ])
    renderWithProviders(<LocaleProbe />)
    await screen.findByText('status:loaded')
    await userEvent.click(screen.getByRole('button', { name: 'en' }))
    await waitFor(() => expect(fetch?.calls.find((call) => call.method === 'PUT')?.body).toEqual({ locale: 'en' }))
    expect(screen.getByText('lang:en')).toBeInTheDocument()
  })

  it('useSetLocale keeps the pick local when the backend has no preferences endpoint', async () => {
    fetch = mockFetch([]) // unmocked routes answer 404, like a backend without the endpoint
    renderWithProviders(<LocaleProbe />)
    await screen.findByText('status:none')
    await userEvent.click(screen.getByRole('button', { name: 'en' }))
    expect(await screen.findByText('lang:en')).toBeInTheDocument()
    expect(fetch.calls.some((call) => call.method === 'PUT')).toBe(false)
    expect(localStorage.getItem('wasichai-test.lang')).toBe('en')
  })

  it('useSetLocale rolls back the language when the PUT fails', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'system', locale: 'es' } },
      { method: 'PUT', path: '/auth/me/preferences', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } }
    ])
    renderWithProviders(<LocaleProbe />)
    await screen.findByText('status:loaded')
    await userEvent.click(screen.getByRole('button', { name: 'en' }))
    await waitFor(() => expect(screen.getByText('lang:es')).toBeInTheDocument())
    expect(localStorage.getItem('wasichai-test.lang')).toBe('es')
  })

  it('keyed by user: signed out, nothing is fetched', () => {
    fetch = mockFetch([])
    renderWithProviders(<Probe />, { user: null })
    expect(fetch.calls.some((call) => call.path === '/auth/me/preferences')).toBe(false)
  })
})

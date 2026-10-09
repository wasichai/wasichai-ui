import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { useTheme } from './ThemeProvider'
import { resolveTheme, BUILT_IN_THEMES, type ThemeDefinition } from './themes'

const PINO: ThemeDefinition = { id: 'sgspe-pino', label: 'theme.pino', colorScheme: 'light' }
const NOCHE: ThemeDefinition = { id: 'sgspe-noche', label: 'theme.noche', colorScheme: 'dark' }
const SGSPE = { themes: [PINO, NOCHE], systemThemes: { light: 'sgspe-pino', dark: 'sgspe-noche' } }

function Probe() {
  const { preference, theme, setPreference } = useTheme()
  return (
    <>
      <p>{`${preference}:${theme.id}`}</p>
      <button onClick={() => void setPreference('dark').catch(() => {})}>dark</button>
    </>
  )
}

// jsdom has no matchMedia; this one lets a test flip the os setting
function stubMatchMedia(dark: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn)
  }
  vi.stubGlobal('matchMedia', () => query)
  return {
    flip: (next: boolean) => {
      query.matches = next
      listeners.forEach((fn) => fn())
    }
  }
}

let fetch: FetchMock | null = null
beforeEach(() => localStorage.clear())
afterEach(() => {
  fetch?.restore()
  fetch = null
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
})

describe('resolveTheme', () => {
  it('maps system to the os setting and an unknown id to system', () => {
    expect(resolveTheme('system', BUILT_IN_THEMES, true).id).toBe('dark')
    expect(resolveTheme('system', BUILT_IN_THEMES, false).id).toBe('light')
    expect(resolveTheme('sepia', BUILT_IN_THEMES, true).id).toBe('dark')
    expect(resolveTheme('light', BUILT_IN_THEMES, true).id).toBe('light')
  })
})

describe('ThemeProvider', () => {
  it('works without matchMedia and defaults to light', () => {
    renderWithProviders(<Probe />)
    expect(screen.getByText('system:light')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('follows the os while the preference is system', () => {
    const os = stubMatchMedia(false)
    renderWithProviders(<Probe />)
    act(() => os.flip(true))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('reads and writes the local copy', async () => {
    fetch = mockFetch([]) // backend without preferences: the local copy is the only store
    localStorage.setItem('wasichai-test.theme', 'light')
    renderWithProviders(<Probe />)
    expect(screen.getByText('light:light')).toBeInTheDocument()
    await waitFor(() => expect(fetch?.calls.some((call) => call.path === '/auth/me/preferences')).toBe(true))
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(await screen.findByText('dark:dark')).toBeInTheDocument()
    expect(localStorage.getItem('wasichai-test.theme')).toBe('dark')
  })

  it('applies an app theme with its color scheme', () => {
    localStorage.setItem('wasichai-test.theme', 'high-contrast')
    renderWithProviders(<Probe />, { config: { themes: [{ id: 'high-contrast', label: 'theme.hc', colorScheme: 'dark' }] } })
    expect(document.documentElement.dataset.theme).toBe('high-contrast')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('reads an unknown id as system', () => {
    localStorage.setItem('wasichai-test.theme', 'sepia')
    renderWithProviders(<Probe />)
    expect(screen.getByText('sepia:light')).toBeInTheDocument()
  })

  it('applies systemThemes.light before paint when nothing is stored', () => {
    renderWithProviders(<Probe />, { config: SGSPE })
    // no await: the layout effect ran inside render, before the browser could paint
    expect(screen.getByText('system:sgspe-pino')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('sgspe-pino')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('applies systemThemes.dark on first render when the os is dark', () => {
    stubMatchMedia(true)
    renderWithProviders(<Probe />, { config: SGSPE })
    expect(screen.getByText('system:sgspe-noche')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('sgspe-noche')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('follows the os between the systemThemes pair', () => {
    const os = stubMatchMedia(false)
    renderWithProviders(<Probe />, { config: SGSPE })
    act(() => os.flip(true))
    expect(document.documentElement.dataset.theme).toBe('sgspe-noche')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('reads an unknown stored id as the systemThemes pair', () => {
    localStorage.setItem('wasichai-test.theme', 'sepia')
    renderWithProviders(<Probe />, { config: SGSPE })
    expect(screen.getByText('sepia:sgspe-pino')).toBeInTheDocument()
  })

  it('lands the api default system on the pair over a local copy', async () => {
    fetch = mockFetch([{ path: '/auth/me/preferences', body: { theme: 'system', locale: null } }])
    localStorage.setItem('wasichai-test.theme', 'dark')
    renderWithProviders(<Probe />, { config: SGSPE })
    expect(await screen.findByText('system:sgspe-pino')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('sgspe-pino')
  })
})

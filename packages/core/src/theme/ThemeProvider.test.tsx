import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { useTheme } from './ThemeProvider'
import { resolveTheme, BUILT_IN_THEMES } from './themes'

function Probe() {
  const { preference, theme, setPreference } = useTheme()
  return (
    <>
      <p>{`${preference}:${theme.id}`}</p>
      <button onClick={() => void setPreference('dark')}>dark</button>
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

beforeEach(() => localStorage.clear())
afterEach(() => {
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
    localStorage.setItem('wasichai-test.theme', 'dark')
    renderWithProviders(<Probe />)
    expect(screen.getByText('dark:dark')).toBeInTheDocument()
    localStorage.setItem('wasichai-test.theme', 'light')
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
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
})

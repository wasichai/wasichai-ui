import { createContext, use, useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useApiClient, useWasichaiConfig } from '../app/context'
import { availableThemes, resolveTheme, SYSTEM_THEME, type ThemeDefinition } from './themes'

export interface ThemeContextValue {
  preference: string
  theme: ThemeDefinition
  colorScheme: 'light' | 'dark'
  themes: ThemeDefinition[]
  setPreference: (id: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const DARK_QUERY = '(prefers-color-scheme: dark)'

// jsdom and old browsers have no matchMedia: read as light, never throw
function subscribeSystem(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function systemDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const config = useWasichaiConfig()
  const { keys } = useApiClient()
  const themes = useMemo(() => availableThemes(config), [config])
  const [preference, setLocal] = useState(() => localStorage.getItem(keys.theme) ?? SYSTEM_THEME)
  const dark = useSyncExternalStore(subscribeSystem, systemDark, () => false)
  const theme = resolveTheme(preference, themes, dark)

  // layout effect: before paint, so a switch never shows one frame of the old theme
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme.id
    document.documentElement.style.colorScheme = theme.colorScheme
  }, [theme])

  const setPreference = useCallback(
    async (id: string) => {
      localStorage.setItem(keys.theme, id)
      setLocal(id)
    },
    [keys.theme]
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, colorScheme: theme.colorScheme, themes, setPreference }),
    [preference, theme, themes, setPreference]
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

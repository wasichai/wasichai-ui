import type { WasichaiConfig } from '../app/config'

export interface ThemeDefinition {
  id: string
  // i18n key in the core namespace or the app's
  label: string
  // tells the browser (scrollbars, inputs) and modules like gis which side the theme is on
  colorScheme: 'light' | 'dark'
}

export const SYSTEM_THEME = 'system'

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  { id: 'light', label: 'theme.light', colorScheme: 'light' },
  { id: 'dark', label: 'theme.dark', colorScheme: 'dark' }
]

export function availableThemes(config: Pick<WasichaiConfig, 'themes'>): ThemeDefinition[] {
  return [...BUILT_IN_THEMES, ...(config.themes ?? [])]
}

// system and unknown ids (another app's theme) both fall to the os setting
export function resolveTheme(preference: string, themes: ThemeDefinition[], systemDark: boolean): ThemeDefinition {
  const chosen = themes.find((theme) => theme.id === preference)
  if (chosen) return chosen
  return themes.find((theme) => theme.id === (systemDark ? 'dark' : 'light')) ?? themes[0]
}

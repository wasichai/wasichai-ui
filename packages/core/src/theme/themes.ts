import type { WasichaiConfig } from '../app/config'

export interface ThemeDefinition {
  id: string
  // i18n key in the core namespace or the app's
  label: string
  // tells the browser (scrollbars, inputs) and modules like gis which side the theme is on
  colorScheme: 'light' | 'dark'
}

export const SYSTEM_THEME = 'system'

// the themes "system" follows on a light and on a dark os
export interface SystemThemes {
  light: string
  dark: string
}

export const DEFAULT_SYSTEM_THEMES: SystemThemes = { light: 'light', dark: 'dark' }

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  { id: 'light', label: 'theme.light', colorScheme: 'light' },
  { id: 'dark', label: 'theme.dark', colorScheme: 'dark' }
]

// optional, not built in: pairs with @wasichai/ui/themes/portal-tributario.css.
// an app that imports the sheet lists this in config.themes. light only
export const PORTAL_TRIBUTARIO_THEME: ThemeDefinition = { id: 'portal-tributario', label: 'theme.portalTributario', colorScheme: 'light' }

export function availableThemes(config: Pick<WasichaiConfig, 'themes'>): ThemeDefinition[] {
  return [...BUILT_IN_THEMES, ...(config.themes ?? [])]
}

// system and unknown ids (another app's theme) both fall to the os side of systemThemes
export function resolveTheme(
  preference: string,
  themes: ThemeDefinition[],
  systemDark: boolean,
  systemThemes: SystemThemes = DEFAULT_SYSTEM_THEMES
): ThemeDefinition {
  const chosen = themes.find((theme) => theme.id === preference)
  if (chosen) return chosen
  return themes.find((theme) => theme.id === (systemDark ? systemThemes.dark : systemThemes.light)) ?? themes[0]
}

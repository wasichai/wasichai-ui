import type { WasichaiConfig } from '../app/config'

// an app theme has no i18n namespace of its own: it may give its words per language instead of a key (#115)
export type ThemeLabel = string | Readonly<Record<string, string>>

export interface ThemeDefinition {
  id: string
  // an i18n key (core's namespace or a module's), or the text per language: { es: 'Quipu oscuro', en: 'Quipu dark' }
  label: ThemeLabel
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

// optional, not built in: @wasichai/ui/themes/ant-design.css styles both halves. an app lists one or both, and pairs
// them for "system" with systemThemes: { light: 'ant-design', dark: 'ant-design-dark' }
export const ANT_DESIGN_THEME: ThemeDefinition = { id: 'ant-design', label: 'theme.antDesign', colorScheme: 'light' }
export const ANT_DESIGN_DARK_THEME: ThemeDefinition = { id: 'ant-design-dark', label: 'theme.antDesignDark', colorScheme: 'dark' }

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

// a key goes through t. a text per language: the current one, then the fallback (config.languages[0]), then any,
// so the selector never shows nothing
export function themeLabel(label: ThemeLabel, t: (key: string) => string, language: string, fallback?: string): string {
  if (typeof label === 'string') return t(label)
  const base = language.split('-')[0]
  return label[language] ?? label[base] ?? (fallback ? label[fallback] : undefined) ?? Object.values(label)[0] ?? ''
}

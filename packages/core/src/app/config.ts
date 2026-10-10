import { availableThemes, type SystemThemes, type ThemeDefinition } from '../theme/themes'

export interface WasichaiConfig {
  // where the REST api lives: '/api', 'https://host/api'. a trailing slash is dropped
  apiBaseUrl: string
  // localStorage keys become `<prefix>.token|user|lang|theme`. two apps on one origin need two prefixes
  storagePrefix: string
  // first one is the default and the fallback
  languages: string[]
  // shell header. unset falls back to the `app.name` / `app.tagline` strings
  appName?: string
  appTagline?: string
  // router basename when the app is not served from '/'
  basename?: string
  // login form prefill. empty for real apps, examples put a demo account here
  defaultLoginEmail: string
  // extra themes; light and dark are always there
  themes?: ThemeDefinition[]
  // which themes "system" (and an unknown id) resolves to. unset = light / dark
  systemThemes?: SystemThemes
  // IANA zone DynamicForm reads and writes DATETIME wall times in ('America/Lima'). unset = the browser's
  timeZone?: string
}

export const DEFAULT_CONFIG: WasichaiConfig = {
  apiBaseUrl: '/api',
  storagePrefix: 'wasichai',
  languages: ['es', 'en'],
  defaultLoginEmail: ''
}

export interface StorageKeys {
  token: string
  user: string
  lang: string
  theme: string
}

export function storageKeys(prefix: string): StorageKeys {
  return { token: `${prefix}.token`, user: `${prefix}.user`, lang: `${prefix}.lang`, theme: `${prefix}.theme` }
}

export function resolveConfig(config: Partial<WasichaiConfig> = {}): WasichaiConfig {
  // `{ apiBaseUrl: undefined }` means "not set", not "set to nothing"
  const given = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined)) as Partial<WasichaiConfig>
  const merged: WasichaiConfig = { ...DEFAULT_CONFIG, ...given }
  if (merged.languages.length === 0) throw new Error('wasichai: config.languages needs at least one language')
  if (!merged.storagePrefix.trim()) throw new Error('wasichai: config.storagePrefix must not be empty')
  if (merged.timeZone !== undefined && !isTimeZone(merged.timeZone)) throw new Error(`wasichai: config.timeZone '${merged.timeZone}' is not an IANA time zone`)
  const themes = availableThemes(merged)
  const ids = themes.map((theme) => theme.id)
  const repeated = ids.find((id, index) => ids.indexOf(id) !== index)
  if (repeated) throw new Error(`wasichai: theme '${repeated}' is defined twice`)
  if (merged.systemThemes) {
    for (const side of ['light', 'dark'] as const) {
      const id = merged.systemThemes[side]
      const theme = themes.find((candidate) => candidate.id === id)
      if (!theme) throw new Error(`wasichai: config.systemThemes.${side} '${id}' is not one of the app's themes`)
      if (theme.colorScheme !== side) throw new Error(`wasichai: config.systemThemes.${side} '${id}' is a ${theme.colorScheme} theme`)
    }
  }
  return { ...merged, apiBaseUrl: merged.apiBaseUrl.replace(/\/+$/, '') }
}

// a typo would otherwise throw on the first DATETIME field drawn, far from the config
function isTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

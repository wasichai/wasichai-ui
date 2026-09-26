import { availableThemes, type ThemeDefinition } from '../theme/themes'

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
  const ids = availableThemes(merged).map((theme) => theme.id)
  const repeated = ids.find((id, index) => ids.indexOf(id) !== index)
  if (repeated) throw new Error(`wasichai: theme '${repeated}' is defined twice`)
  return { ...merged, apiBaseUrl: merged.apiBaseUrl.replace(/\/+$/, '') }
}

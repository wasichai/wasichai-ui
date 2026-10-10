import { describe, expect, it } from 'vitest'
import type { SystemThemes, ThemeDefinition } from '../theme/themes'
import { DEFAULT_CONFIG, resolveConfig, storageKeys } from './config'

const PINO: ThemeDefinition = { id: 'sgspe-pino', label: 'theme.pino', colorScheme: 'light' }
const NOCHE: ThemeDefinition = { id: 'sgspe-noche', label: 'theme.noche', colorScheme: 'dark' }
const PAIR = { light: 'sgspe-pino', dark: 'sgspe-noche' }

describe('resolveConfig', () => {
  it('fills what the app left out with the defaults', () => {
    expect(resolveConfig({ appName: 'Catastro' })).toEqual({ ...DEFAULT_CONFIG, appName: 'Catastro' })
  })

  it('ignores keys passed as undefined instead of wiping the default', () => {
    expect(resolveConfig({ apiBaseUrl: undefined }).apiBaseUrl).toBe('/api')
  })

  it('drops trailing slashes from the api base url', () => {
    expect(resolveConfig({ apiBaseUrl: 'https://host/api//' }).apiBaseUrl).toBe('https://host/api')
  })

  it('refuses an app with no language or no storage prefix', () => {
    expect(() => resolveConfig({ languages: [] })).toThrow(/languages/)
    expect(() => resolveConfig({ storagePrefix: ' ' })).toThrow(/storagePrefix/)
  })

  it('keeps a valid time zone and refuses one that is not', () => {
    expect(resolveConfig().timeZone).toBeUndefined()
    expect(resolveConfig({ timeZone: 'America/Lima' }).timeZone).toBe('America/Lima')
    expect(() => resolveConfig({ timeZone: 'America/Limaa' })).toThrow(/timeZone 'America\/Limaa'/)
    expect(() => resolveConfig({ timeZone: ' ' })).toThrow(/timeZone/)
  })

  it('refuses an app theme that reuses a built-in id', () => {
    expect(() => resolveConfig({ themes: [{ id: 'dark', label: 'x', colorScheme: 'dark' }] })).toThrow(/theme 'dark'/)
  })

  it('leaves systemThemes unset by default and keeps a valid pair', () => {
    expect(resolveConfig().systemThemes).toBeUndefined()
    expect(resolveConfig({ themes: [PINO, NOCHE], systemThemes: PAIR }).systemThemes).toEqual(PAIR)
    expect(() => resolveConfig({ systemThemes: { light: 'light', dark: 'dark' } })).not.toThrow()
  })

  it('refuses a systemThemes id that is not a theme', () => {
    expect(() => resolveConfig({ systemThemes: PAIR })).toThrow(/systemThemes\.light 'sgspe-pino' is not one of/)
    expect(() => resolveConfig({ themes: [PINO], systemThemes: PAIR })).toThrow(/systemThemes\.dark 'sgspe-noche' is not one of/)
    expect(() => resolveConfig({ systemThemes: { light: 'light' } as SystemThemes })).toThrow(/systemThemes\.dark/)
  })

  it('refuses a systemThemes id with the wrong colorScheme', () => {
    expect(() => resolveConfig({ themes: [PINO, NOCHE], systemThemes: { light: 'sgspe-noche', dark: 'dark' } })).toThrow(
      /systemThemes\.light 'sgspe-noche' is a dark theme/
    )
    expect(() => resolveConfig({ systemThemes: { light: 'light', dark: 'light' } })).toThrow(/systemThemes\.dark 'light' is a light theme/)
  })
})

describe('storageKeys', () => {
  it('namespaces every key under the prefix', () => {
    expect(storageKeys('catastro')).toEqual({
      token: 'catastro.token',
      user: 'catastro.user',
      lang: 'catastro.lang',
      theme: 'catastro.theme'
    })
  })
})

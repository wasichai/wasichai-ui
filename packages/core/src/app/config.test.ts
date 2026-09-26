import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, resolveConfig, storageKeys } from './config'

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
})

describe('storageKeys', () => {
  it('namespaces every key under the prefix', () => {
    expect(storageKeys('catastro')).toEqual({ token: 'catastro.token', user: 'catastro.user', lang: 'catastro.lang' })
  })
})

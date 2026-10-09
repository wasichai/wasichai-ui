import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../app/config'
import en from '../i18n/locales/en/common.json'
import es from '../i18n/locales/es/common.json'
import { availableThemes, BUILT_IN_THEMES, PORTAL_TRIBUTARIO_THEME, resolveTheme, type ThemeDefinition } from './themes'

// same trick as boundaries.test.ts: vite rewrites `new URL(_, import.meta.url)`, not import.meta.dirname
const SHEET = join(import.meta.dirname, '..', '..', '..', 'ui', 'src', 'themes', 'portal-tributario', 'tokens.css')

describe('PORTAL_TRIBUTARIO_THEME', () => {
  it('is opt-in, not built in', () => {
    expect(BUILT_IN_THEMES.map((theme) => theme.id)).toEqual(['light', 'dark'])
  })

  it('registers through config.themes next to light and dark', () => {
    const config = resolveConfig({ themes: [PORTAL_TRIBUTARIO_THEME] })
    expect(availableThemes(config).map((theme) => theme.id)).toEqual(['light', 'dark', 'portal-tributario'])
  })

  it('is picked when stored, whatever the os says', () => {
    const themes = availableThemes({ themes: [PORTAL_TRIBUTARIO_THEME] })
    expect(resolveTheme('portal-tributario', themes, true)).toBe(PORTAL_TRIBUTARIO_THEME)
    expect(PORTAL_TRIBUTARIO_THEME.colorScheme).toBe('light')
  })

  it('has an id the server stores (ADR-034)', () => {
    expect(PORTAL_TRIBUTARIO_THEME.id).toMatch(/^[a-z0-9-]{1,40}$/)
  })

  it('has its label in both core locales', () => {
    const [group, key] = PORTAL_TRIBUTARIO_THEME.label.split('.')
    expect(en).toHaveProperty([group, key], 'Tax portal')
    expect(es).toHaveProperty([group, key], 'Portal tributario')
  })

  it('pairs with the @wasichai/ui sheet that styles its id', () => {
    expect(readFileSync(SHEET, 'utf8')).toContain(`[data-theme='${PORTAL_TRIBUTARIO_THEME.id}']`)
  })
})

const PINO: ThemeDefinition = { id: 'sgspe-pino', label: 'theme.pino', colorScheme: 'light' }
const NOCHE: ThemeDefinition = { id: 'sgspe-noche', label: 'theme.noche', colorScheme: 'dark' }
const PAIR = { light: 'sgspe-pino', dark: 'sgspe-noche' }

describe('resolveTheme with systemThemes', () => {
  const themes = availableThemes({ themes: [PINO, NOCHE] })

  it('sends system to the configured pair', () => {
    expect(resolveTheme('system', themes, false, PAIR)).toBe(PINO)
    expect(resolveTheme('system', themes, true, PAIR)).toBe(NOCHE)
  })

  it('sends an unknown id to the configured pair', () => {
    expect(resolveTheme('sepia', themes, false, PAIR)).toBe(PINO)
    expect(resolveTheme('sepia', themes, true, PAIR)).toBe(NOCHE)
  })

  it('still honours a picked built-in', () => {
    expect(resolveTheme('light', themes, true, PAIR).id).toBe('light')
    expect(resolveTheme('dark', themes, false, PAIR).id).toBe('dark')
  })

  it('falls to light and dark without a pair', () => {
    expect(resolveTheme('system', themes, false).id).toBe('light')
    expect(resolveTheme('system', themes, true).id).toBe('dark')
  })

  it('falls to the first theme when the list lacks the pair', () => {
    expect(resolveTheme('system', BUILT_IN_THEMES, true, PAIR).id).toBe('light')
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { changeLanguage, createWasichaiI18n } from './createI18n'
import es from './locales/es/common.json'

const KEY = 'i18n-test.lang'
const plans = { id: 'plans', i18n: { es: { nav: { sheets: 'Hojas' } }, en: { nav: { sheets: 'Sheets' } } } }

beforeEach(() => localStorage.clear())

describe('createWasichaiI18n', () => {
  it('serves core strings from the default namespace, first language first', () => {
    const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: KEY, modules: [] })
    expect(i18n.language).toBe('es')
    expect(i18n.t('common.save')).toBe('Guardar')
  })

  it('serves each module under its own namespace', () => {
    const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: KEY, modules: [plans] })
    expect(i18n.t('plans:nav.sheets')).toBe('Hojas')
    expect(i18n.t('nav.sheets')).toBe('nav.sheets')
  })

  it('starts on the language the user picked last time', () => {
    localStorage.setItem(KEY, 'en')
    const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: KEY, modules: [plans] })
    expect(i18n.t('common.save')).toBe('Save')
    expect(i18n.t('plans:nav.sheets')).toBe('Sheets')
  })

  it('ignores a stored language the app does not offer', () => {
    localStorage.setItem(KEY, 'fr')
    expect(createWasichaiI18n({ languages: ['es', 'en'], storageKey: KEY, modules: [] }).language).toBe('es')
    localStorage.setItem(KEY, 'es')
    expect(createWasichaiI18n({ languages: ['en'], storageKey: KEY, modules: [] }).language).toBe('en')
  })

  it('refuses to start with no languages configured', () => {
    expect(() => createWasichaiI18n({ languages: [], storageKey: KEY, modules: [] })).toThrow(/at least one language/)
  })

  it('keeps two apps apart: each instance has its own language', async () => {
    const one = createWasichaiI18n({ languages: ['es', 'en'], storageKey: 'one.lang', modules: [] })
    const two = createWasichaiI18n({ languages: ['es', 'en'], storageKey: 'two.lang', modules: [] })
    await changeLanguage(one, 'one.lang', 'en')
    expect(one.language).toBe('en')
    expect(two.language).toBe('es')
    expect(localStorage.getItem('one.lang')).toBe('en')
  })

  it('merges the feature bundles into common', () => {
    const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: KEY, modules: [] })
    expect(i18n.t('history.title')).toBe('Historial')
    expect(i18n.t('common.save')).toBe('Guardar')
  })

  it('falls back to common for a module namespace missing a key', () => {
    const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: KEY, modules: [{ id: 'x' }] })
    expect(i18n.getFixedT(null, 'x')('common.loading')).toBe('Cargando…')
  })
})

// every leaf of a nested bundle, as a dotted path: 'common.records_one'
const leaves = (bundle: object, prefix = ''): string[] =>
  Object.entries(bundle).flatMap(([key, value]) => (typeof value === 'object' && value !== null ? leaves(value, `${prefix}${key}.`) : [`${prefix}${key}`]))

// Intl.PluralRules('es') answers `many` for exact millions (1,000,000 registros): a `_one` key with no `_many` twin
// makes i18next print the raw key there. the twin carries the same text as `_other`
describe('the Spanish bundle', () => {
  it('has a _many twin for every _one key', () => {
    const keys = leaves(es)
    const ones = keys.filter((key) => key.endsWith('_one'))
    expect(ones.length).toBeGreaterThan(0)
    expect(ones.map((key) => key.replace(/_one$/, '_many')).filter((many) => !keys.includes(many))).toEqual([])
  })
})

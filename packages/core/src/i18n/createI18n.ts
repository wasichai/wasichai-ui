import i18next, { type i18n as I18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { WasichaiModule } from '../registry/contract'
import { coreBundles } from './coreBundles'
import en from './locales/en/common.json'
import es from './locales/es/common.json'

export const CORE_NAMESPACE = 'common'

const CORE_LOCALES: Record<string, Record<string, unknown>> = { es, en }

export interface WasichaiI18nOptions {
  languages: string[]
  storageKey: string
  modules: readonly WasichaiModule[]
}

// a language the app does not offer (another app on this origin, an old build) is ignored
function startLanguage(storageKey: string, languages: string[]): string {
  const stored = localStorage.getItem(storageKey)
  return stored && languages.includes(stored) ? stored : languages[0]
}

// one instance per app. core strings under `common`, the default namespace, so t('x.y') needs no
// prefix. each module under its own id: t('gis:nav.maps').
export function createWasichaiI18n({ languages, storageKey, modules }: WasichaiI18nOptions): I18n {
  if (languages.length === 0) throw new Error('wasichai: createWasichaiI18n needs at least one language')
  const defaultLanguage = languages[0]
  // languages[0] is the default by construction; this guards the invariant explicitly so a future
  // change (e.g. a distinct default not drawn from the list) fails loudly instead of silently
  if (!languages.includes(defaultLanguage)) throw new Error(`wasichai: default language '${defaultLanguage}' must be one of languages`)

  const resources: Record<string, Record<string, Record<string, unknown>>> = {}
  for (const language of languages) {
    resources[language] = { [CORE_NAMESPACE]: CORE_LOCALES[language] ?? {} }
    for (const module of modules) {
      const strings = module.i18n?.[language]
      if (strings) resources[language][module.id] = strings
    }
  }

  const instance = i18next.createInstance()
  void instance.use(initReactI18next).init({
    resources,
    lng: startLanguage(storageKey, languages),
    fallbackLng: languages[0],
    ns: [CORE_NAMESPACE, ...modules.map((module) => module.id)],
    defaultNS: CORE_NAMESPACE,
    fallbackNS: CORE_NAMESPACE,
    interpolation: { escapeValue: false },
    // resources are inline: init synchronously so the first render already has strings
    initAsync: false
  })

  for (const bundle of coreBundles) {
    for (const language of languages) {
      const strings = bundle[language]
      if (strings) instance.addResourceBundle(language, CORE_NAMESPACE, strings, true, true)
    }
  }
  return instance
}

export async function changeLanguage(instance: I18n, storageKey: string, language: string): Promise<void> {
  localStorage.setItem(storageKey, language)
  await instance.changeLanguage(language)
}

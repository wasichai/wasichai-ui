import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useApiClient, useWasichaiConfig } from '../app/context'
import { changeLanguage } from '../i18n/createI18n'
import { usePreferences } from './preferences'

// the stored locale follows the user to another browser. only a configured language is applied
export function LocaleSync() {
  const { i18n } = useTranslation()
  const { keys } = useApiClient()
  const { languages } = useWasichaiConfig()
  const locale = usePreferences().data?.locale ?? null
  useEffect(() => {
    if (locale && languages.includes(locale) && locale !== i18n.language) void changeLanguage(i18n, keys.lang, locale)
  }, [locale, languages, i18n, keys.lang])
  return null
}

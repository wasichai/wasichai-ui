import { useTranslation } from 'react-i18next'
import { Input } from '@wasichai/ui'
import { useWasichaiConfig } from '../../app/context'
import type { LocalizedTexts } from '../../types/metadata'

interface LanguageTextsProps {
  // ids and aria names: `${id}-${language}`
  id: string
  // what the texts are of, for the aria name: "Etiqueta (en)"
  name: string
  texts: LocalizedTexts | undefined
  onChange: (texts: LocalizedTexts) => void
}

// one input per language of config.languages, as the workflow editor does (ADR-070, ADR-078). an emptied one drops
// its language, so the screen shows the single text for it
export function LanguageTexts({ id, name, texts = {}, onChange }: LanguageTextsProps) {
  const { languages } = useWasichaiConfig()
  const set = (language: string, text: string) => {
    const rest = Object.fromEntries(Object.entries(texts).filter(([key]) => key !== language))
    onChange(text.trim() ? { ...rest, [language]: text } : rest)
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {languages.map((language) => (
        <Input
          key={language}
          id={`${id}-${language}`}
          aria-label={`${name} (${language})`}
          placeholder={language}
          value={texts[language] ?? ''}
          onChange={(event) => set(language, event.target.value)}
        />
      ))}
    </div>
  )
}

// the hint every group of inputs carries
export function LanguageTextsHint() {
  const { t } = useTranslation()
  return <p className="text-xs text-ink-muted">{t('objects.translationsHint')}</p>
}

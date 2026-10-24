import { useTranslation } from 'react-i18next'
import { Alert } from '@wasichai/ui'
import { useWasichaiConfig } from '../../app/context'

// the model editors say so when the app's model lives in its repository (config.modelInRepository):
// what is changed here is not there, and the next deployment may undo it
export function ModelInRepositoryNotice({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { modelInRepository } = useWasichaiConfig()
  if (!modelInRepository) return null
  return (
    <Alert tone="warning" title={t('modelSource.title')} className={className}>
      {t('modelSource.inRepository')}
    </Alert>
  )
}

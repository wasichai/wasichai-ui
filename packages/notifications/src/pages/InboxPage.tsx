import { useTranslation } from 'react-i18next'

// placeholder: the inbox screen arrives in a later task
export function InboxPage() {
  const { t } = useTranslation('notifications')
  return <h1 className="text-xl font-semibold">{t('notifications.title')}</h1>
}

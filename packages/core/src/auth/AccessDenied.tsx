import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@wasichai/ui'

export interface AccessDeniedProps {
  // the backend's own reason (problem detail): not invited, organization not in the app, disabled
  detail: string
  onSignOut: () => void
}

// the realm let them in, the app did not. full page: an empty app would hide why
export function AccessDenied({ detail, onSignOut }: AccessDeniedProps) {
  const { t } = useTranslation()
  return (
    <div data-slot="access-denied" className="flex h-full items-center justify-center bg-shell px-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-7 text-center shadow-xl">
        <Lock aria-hidden className="mx-auto size-8 text-danger" />
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">{t('auth.accessDenied')}</h1>
        <p className="mt-2 text-sm text-ink-muted">{detail}</p>
        <Button className="mt-6 w-full" onClick={onSignOut}>
          {t('auth.signOut')}
        </Button>
      </div>
    </div>
  )
}

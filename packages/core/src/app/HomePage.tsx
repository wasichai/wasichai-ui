import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { useWasichai } from './context'
import { resolveHome } from './home'

// core:home. the app's start page by permissions, or the dashboard
export function HomePage() {
  const { t } = useTranslation()
  const { config, registry } = useWasichai()
  const auth = useAuth()
  const target = resolveHome(config.homeRoute, registry, auth)
  if (target.kind === 'error') throw target.error
  if (target.kind === 'loading') return <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
  if (target.kind === 'route') return <Navigate to={target.path} replace />
  return <DashboardPage />
}

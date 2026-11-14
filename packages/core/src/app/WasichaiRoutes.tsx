import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { CORE_MODULE_ID } from '../links/links'
import type { RouteChrome } from '../registry/contract'
import { AppShell } from '../shell/AppShell'
import { AuthGate } from './AuthGate'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { useWasichaiConfig, useWasichaiLinks, useRegistry } from './context'

// every registered route, grouped by chrome. unknown paths go home.
export function WasichaiRoutes() {
  const { t } = useTranslation()
  const registry = useRegistry()
  const links = useWasichaiLinks()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { publicHome } = useWasichaiConfig()
  // signed out, the app's landing page takes core:home's path, out of the shell and the gate
  const PublicHome = user ? undefined : publicHome
  const home = registry.routes.find((route) => route.key === `${CORE_MODULE_ID}:home`)
  const replaced = PublicHome ? home?.key : undefined

  const mount = (chrome: RouteChrome) =>
    registry.routes
      .filter((route) => route.chrome === chrome && route.key !== replaced)
      .map((route) => <Route key={route.key} path={route.path} element={<route.Component />} />)

  return (
    // shell routes suspend and fail inside the shell; these catch public and bare ones
    <RouteErrorBoundary resetKey={pathname}>
      <Suspense fallback={<p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>}>
        <Routes>
          {mount('public')}
          {PublicHome && home && <Route path={home.path} element={<PublicHome />} />}
          {/* bare: a printed sheet has no sidebar, so the browser's pdf has no chrome in it */}
          <Route
            element={
              <AuthGate>
                <Outlet />
              </AuthGate>
            }
          >
            {mount('bare')}
          </Route>
          <Route
            element={
              <AuthGate>
                <AppShell />
              </AuthGate>
            }
          >
            {mount('shell')}
          </Route>
          <Route path="*" element={<Navigate to={links.home()} replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}

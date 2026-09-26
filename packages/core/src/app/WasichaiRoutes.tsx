import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import type { RouteChrome } from '../registry/contract'
import { AppShell } from '../shell/AppShell'
import { AuthGate } from './AuthGate'
import { useWasichaiLinks, useRegistry } from './context'

// every registered route, grouped by chrome. unknown paths go home.
export function WasichaiRoutes() {
  const { t } = useTranslation()
  const registry = useRegistry()
  const links = useWasichaiLinks()

  const mount = (chrome: RouteChrome) =>
    registry.routes.filter((route) => route.chrome === chrome).map((route) => <Route key={route.key} path={route.path} element={<route.Component />} />)

  return (
    // shell routes suspend inside the shell; this catches public and bare ones
    <Suspense fallback={<p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>}>
      <Routes>
        {mount('public')}
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
  )
}

import { Home, LogOut } from 'lucide-react'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Button, cn } from '@wasichai/ui'
import { ApiError } from '../api/client'
import { useWasichaiConfig, useWasichaiLinks, useRegistry } from '../app/context'
import { RouteErrorBoundary } from '../app/RouteErrorBoundary'
import { useAuth } from '../auth/AuthProvider'
import { useSetLocale } from '../preferences/preferences'
import { useTheme } from '../theme/ThemeProvider'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm',
    isActive ? 'bg-shell-ink/12 text-shell-ink' : 'text-shell-muted hover:bg-shell-ink/8 hover:text-shell-ink'
  )

// the sidebar is what the registered modules contribute. what is not built yet shows as disabled, not missing.
export function AppShell() {
  const { t, i18n } = useTranslation()
  const { user, permissions, signOut } = useAuth()
  const config = useWasichaiConfig()
  const registry = useRegistry()
  const links = useWasichaiLinks()
  const { preference, themes, setPreference } = useTheme()
  const setLocale = useSetLocale()
  const { pathname } = useLocation()
  const [prefsError, setPrefsError] = useState<string | null>(null)

  // errors inline, like the admin pages: a failed save rolls back and says why
  const save = (action: Promise<void>) => {
    setPrefsError(null)
    action.catch((cause: unknown) => setPrefsError(cause instanceof ApiError ? cause.message : String(cause)))
  }

  const languages = config.languages
  const next = languages[(languages.indexOf(i18n.language) + 1) % languages.length]
  const themeValue = preference === 'system' || themes.some((theme) => theme.id === preference) ? preference : 'system'
  // a group whose every entry is hidden or missing would be a heading over nothing
  const groups = registry.navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.visible?.(permissions) ?? true) }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col bg-shell text-shell-ink">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">{config.appName ?? t('app.name')}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-shell-muted">{config.appTagline ?? t('app.tagline')}</p>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          <NavLink to={links.home()} end className={linkClass}>
            <Home className="h-4 w-4" />
            {t('nav.home')}
          </NavLink>

          {groups.map((group) => (
            <div key={group.id}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-shell-muted/70">{t(group.labelKey)}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const icon = Icon ? <Icon className="h-4 w-4" /> : <span className="h-4 w-4" />
                  if (!item.to || item.disabled) {
                    return (
                      <span
                        key={item.key}
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-shell-muted/45"
                        title={t(item.labelKey)}
                      >
                        {icon}
                        {t(item.labelKey)}
                      </span>
                    )
                  }
                  return (
                    <NavLink key={item.key} to={item.to} className={linkClass}>
                      {icon}
                      {t(item.labelKey)}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-shell-ink/10 px-4 py-3">
          <p className="truncate text-xs text-shell-ink">{user?.displayName}</p>
          <p className="truncate text-[11px] text-shell-muted">{user?.email}</p>
          <select
            aria-label={t('theme.label')}
            value={themeValue}
            onChange={(event) => save(setPreference(event.target.value))}
            className="mt-2 w-full rounded-md border border-shell-ink/10 bg-shell px-2 py-1 text-xs text-shell-ink"
          >
            <option value="system">{t('theme.system')}</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {t(theme.label)}
              </option>
            ))}
          </select>
          {prefsError ? (
            <p role="alert" className="mt-1 text-[11px] text-danger">
              {prefsError}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-1">
            {languages.length > 1 ? (
              <Button variant="ghost" size="sm" className="text-shell-muted hover:text-shell-ink" onClick={() => save(setLocale(next))}>
                {next.toUpperCase()}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="text-shell-muted hover:text-shell-ink" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {/* a lazy module page loads here while the sidebar stays, and fails here while it stays too */}
        <RouteErrorBoundary resetKey={pathname}>
          <Suspense fallback={<p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </div>
  )
}

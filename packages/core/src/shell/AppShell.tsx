import { Home, LogOut } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { Button, cn } from '@wasichai/ui'
import { useApiClient, useWasichaiConfig, useWasichaiLinks, useRegistry } from '../app/context'
import { useAuth } from '../auth/AuthProvider'
import { changeLanguage } from '../i18n/createI18n'

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
  const { keys } = useApiClient()

  const languages = config.languages
  const next = languages[(languages.indexOf(i18n.language) + 1) % languages.length]
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
          <div className="mt-2 flex items-center gap-1">
            {languages.length > 1 ? (
              <Button variant="ghost" size="sm" className="text-shell-muted hover:text-shell-ink" onClick={() => void changeLanguage(i18n, keys.lang, next)}>
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
        {/* a lazy module page loads here while the sidebar stays */}
        <Suspense fallback={<p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

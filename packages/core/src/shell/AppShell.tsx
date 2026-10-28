import { Home, LogOut, Menu, X } from 'lucide-react'
import { Suspense, useEffect, useId, useRef, useState, type MouseEvent } from 'react'
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

// tailwind's md: below it the sidebar is a drawer over the page, from it the sidebar of always (#92)
const WIDE_QUERY = '(min-width: 48rem)'

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
  const drawer = useDrawer(pathname)
  const drawerId = useId()

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
    // narrow: a column (menu bar over main), the aside fixed over both. md and up: the row it always was
    <div className="flex h-full flex-col md:flex-row">
      <header inert={drawer.open} className="flex shrink-0 items-center gap-2 bg-shell px-2 py-2 text-shell-ink md:hidden">
        <Button
          ref={drawer.buttonRef}
          variant="ghost"
          size="icon"
          aria-label={t('common.openMenu')}
          aria-expanded={drawer.open}
          aria-controls={drawerId}
          className="text-shell-ink hover:bg-shell-ink/8"
          onClick={drawer.show}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* no app name here: the drawer has it, and a second copy would break apps that find it by text */}
      </header>

      {drawer.open ? <div data-testid="shell-backdrop" aria-hidden className="fixed inset-0 z-40 bg-overlay md:hidden" onClick={() => drawer.hide()} /> : null}

      <aside
        id={drawerId}
        ref={drawer.panelRef}
        className={cn(
          'flex w-60 shrink-0 flex-col bg-shell text-shell-ink',
          // closed: off screen and invisible, so its links leave the tab order too
          'fixed inset-y-0 left-0 z-50 max-w-[85vw] shadow-lg transition-transform duration-200 motion-reduce:transition-none',
          drawer.open ? 'visible translate-x-0' : 'invisible -translate-x-full',
          'md:visible md:static md:z-auto md:max-w-none md:translate-x-0 md:shadow-none md:transition-none'
        )}
      >
        <div className="flex items-start gap-2 px-5 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight">{config.appName ?? t('app.name')}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-shell-muted">{config.appTagline ?? t('app.tagline')}</p>
          </div>
          <button
            type="button"
            aria-label={t('common.closeMenu')}
            className="-mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-shell-muted hover:bg-shell-ink/8 hover:text-shell-ink md:hidden"
            onClick={() => drawer.hide()}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" onClick={drawer.hideOnLink}>
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

      <main inert={drawer.open} className="min-h-0 flex-1 overflow-y-auto">
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

// the narrow drawer: closed by default, closed again by Escape, the backdrop, a link, a route change or the
// screen growing to md. focus goes into it on open and back to the menu button on close
function useDrawer(pathname: string) {
  // the route it was opened on: another route means the user navigated, so it reads as closed
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('a[href], button, select')?.focus()
    else if (wasOpen.current) buttonRef.current?.focus()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('keydown', onKey)
    // jsdom and old browsers have no matchMedia: then only the other ways close it
    const wide = typeof window.matchMedia === 'function' ? window.matchMedia(WIDE_QUERY) : null
    const onWide = () => {
      if (wide?.matches) setOpenOn(null)
    }
    wide?.addEventListener('change', onWide)
    return () => {
      document.removeEventListener('keydown', onKey)
      wide?.removeEventListener('change', onWide)
    }
  }, [open])

  return {
    open,
    buttonRef,
    panelRef,
    show: () => setOpenOn(pathname),
    hide: () => setOpenOn(null),
    // a link to the page already shown changes no route, so the click closes it too
    hideOnLink: (event: MouseEvent) => {
      if ((event.target as Element).closest('a[href]')) setOpenOn(null)
    }
  }
}

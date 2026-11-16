import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAppTitle } from '../organization/currentOrganization'
import { useAuth } from './AuthProvider'
import { Button } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { ApiError } from '../api/client'
import { useWasichaiConfig, useWasichaiLinks } from '../app/context'
import { RETURN_TO_PARAM } from '../links/links'
import type { SignInErrorState } from './AuthCallbackPage'
import { safeReturnTo } from './returnTo'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, mode, signIn, signInWithRealm } = useAuth()
  const navigate = useNavigate()
  const config = useWasichaiConfig()
  const title = useAppTitle()
  const links = useWasichaiLinks()
  const [email, setEmail] = useState(config.defaultLoginEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [search] = useSearchParams()
  // a callback that did not finish says why through router state
  const callbackError = (useLocation().state as Partial<SignInErrorState> | null)?.signInError ?? null
  // anything not provably ours goes home: no open redirect, no loop back to login
  const next = safeReturnTo(search.get(RETURN_TO_PARAM), links.login()) ?? links.home()

  if (user) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    if (mode === 'oidc') {
      try {
        // the browser leaves for the realm: busy stays on
        await signInWithRealm(next)
      } catch {
        setError(t('auth.realmUnreachable'))
        setBusy(false)
      }
      return
    }
    try {
      await signIn(email, password)
      void navigate(next)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('auth.invalid'))
    } finally {
      setBusy(false)
    }
  }
  const shown = error ?? callbackError

  return (
    <div className="flex h-full items-center justify-center bg-shell px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-card bg-surface p-7 shadow-xl" noValidate>
        {config.appLogo != null && (
          <div data-slot="app-logo" aria-hidden className="mb-3">
            {config.appLogo}
          </div>
        )}
        <p className="text-xl font-semibold tracking-tight text-ink">{title.appName}</p>
        <p className="mt-1 text-sm text-ink-muted">{title.appTagline}</p>

        {/* oidc: the realm asks for the password, never this page */}
        {mode === 'local' && (
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>
        )}

        {shown ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {shown}
          </p>
        ) : null}

        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? t('common.loading') : t(mode === 'oidc' ? 'auth.signInWithRealm' : 'auth.signIn')}
        </Button>
      </form>
    </div>
  )
}

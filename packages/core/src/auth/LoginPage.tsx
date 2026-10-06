import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthProvider'
import { Button } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { ApiError } from '../api/client'
import { useWasichaiConfig, useWasichaiLinks } from '../app/context'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const config = useWasichaiConfig()
  const links = useWasichaiLinks()
  const [email, setEmail] = useState(config.defaultLoginEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={links.home()} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      void navigate(links.home())
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('auth.invalid'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-shell px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-card bg-surface p-7 shadow-xl" noValidate>
        <p className="text-xl font-semibold tracking-tight text-ink">{config.appName ?? t('app.name')}</p>
        <p className="mt-1 text-sm text-ink-muted">{config.appTagline ?? t('app.tagline')}</p>

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

        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? t('common.loading') : t('auth.signIn')}
        </Button>
      </form>
    </div>
  )
}

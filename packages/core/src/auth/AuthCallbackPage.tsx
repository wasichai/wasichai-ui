import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { useWasichaiLinks } from '../app/context'
import { LoadingState } from '../components/query-state/QueryState'
import { BootScreen, useRealmCallback } from './AuthProvider'
import { safeReturnTo } from './returnTo'

// router state LoginPage reads: why the last sign in did not finish
export interface SignInErrorState {
  signInError: string
}

// where the realm sends the browser back (oidc). trades the code for the session, then goes where the visitor was going
export function AuthCallbackPage() {
  const { t } = useTranslation()
  const complete = useRealmCallback()
  const navigate = useNavigate()
  const links = useWasichaiLinks()

  useEffect(() => {
    if (!complete) return
    let live = true
    complete().then(
      // returnTo came back through the realm: check it as if it came from the url
      (returnTo) => {
        if (live) void navigate(safeReturnTo(returnTo, links.login()) ?? links.home(), { replace: true })
      },
      // reloaded or reused, the code is spent: login says why, it never comes back here by itself
      () => {
        if (live) void navigate(links.login(), { replace: true, state: { signInError: t('auth.callbackFailed') } satisfies SignInErrorState })
      }
    )
    return () => {
      live = false
    }
  }, [complete, navigate, links, t])

  // local mode has nothing to complete
  if (!complete) return <Navigate to={links.login()} replace />
  return (
    <BootScreen>
      <LoadingState label={t('auth.signingIn')} />
    </BootScreen>
  )
}

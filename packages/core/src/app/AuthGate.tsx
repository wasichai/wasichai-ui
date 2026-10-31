import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { useWasichaiLinks } from './context'

// every signed-in route needs the same check, shell or not: share the check, not the layout
export function AuthGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const links = useWasichaiLinks()
  const location = useLocation()
  // remember where the visitor was going, so login can send them back
  return user ? children : <Navigate to={links.login({ returnTo: location.pathname + location.search + location.hash })} replace />
}

import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { useWasichaiLinks } from './context'

// every signed-in route needs the same check, shell or not: share the check, not the layout
export function AuthGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const links = useWasichaiLinks()
  return user ? children : <Navigate to={links.login()} replace />
}

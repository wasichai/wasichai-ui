import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useWasichaiLinks } from '@wasichai/core'
import { useMarkRead, useNotificationLinks } from './hooks'
import { defaultResolveLink } from './links'
import type { NotificationLink, NotificationLinkResolver } from './types'

export interface NotificationLinkViewProps {
  id: string
  link: NotificationLink | null
  className?: string
  children: ReactNode
  // after the click, e.g. to close a popover
  onNavigate?: () => void
}

// the app's resolver first, core's rules otherwise. no href: the text stays, without a link
export function NotificationLinkView({ id, link, className, children, onNavigate }: NotificationLinkViewProps) {
  const links = useWasichaiLinks()
  const { resolveLink } = useNotificationLinks()
  const markRead = useMarkRead()
  const target = link ? safeResolve(resolveLink ?? defaultResolveLink, link, links) : null
  if (!target) return <span className={className}>{children}</span>

  const onClick = () => {
    markRead.mutate(id)
    onNavigate?.()
  }
  return target.external ? (
    <a href={target.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <Link to={target.href} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

// a resolver of the app may throw on a shape it does not know: that alert simply has no link
function safeResolve(resolve: NotificationLinkResolver, link: NotificationLink, links: ReturnType<typeof useWasichaiLinks>) {
  try {
    return resolve(link, links)
  } catch {
    return null
  }
}

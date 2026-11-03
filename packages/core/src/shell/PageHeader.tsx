import type { ReactNode } from 'react'
import { cn } from '@wasichai/ui'

export interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  // before the h1. core has no breadcrumb component: the app brings its own
  breadcrumbs?: ReactNode
  // under the title and the actions: section tabs, filters
  children?: ReactNode
  // the inner box, to line up with the page body (e.g. 'mx-auto max-w-6xl')
  containerClassName?: string
}

// px-4 below md, as the shell's own cut; the actions wrap under the title when narrow (#124)
export function PageHeader({ title, subtitle, actions, breadcrumbs, children, containerClassName }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className="border-b border-border bg-surface px-4 py-5 md:px-8">
      <div className={cn(containerClassName)}>
        {breadcrumbs ? <div className="mb-2">{breadcrumbs}</div> : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  )
}

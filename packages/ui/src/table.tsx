import type { ComponentProps } from 'react'
import { cn } from './cn'

// data-slot: hooks a theme sheet styles (ADR-035), on the table itself, not its scroll box. before props, so a caller can override them
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn('border-b border-border bg-surface-muted px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('border-b border-border px-4 py-2.5 text-ink', className)} {...props} />
}

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge"
      className={cn('inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong', className)}
      {...props}
    />
  )
}

import type { ComponentProps } from 'react'
import { cn } from './cn'

// data-slot: the hook a theme sheet styles (ADR-035). before props, so a caller can override it
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted/60',
        'disabled:cursor-not-allowed disabled:bg-surface-muted',
        'aria-[invalid=true]:border-danger',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-muted/60 aria-[invalid=true]:border-danger',
        'disabled:cursor-not-allowed disabled:bg-surface-muted',
        className
      )}
      {...props}
    />
  )
}

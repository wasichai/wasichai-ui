import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from './cn'

// cva's defaults, and the hooks' too
const DEFAULTS = { variant: 'primary', size: 'md' } as const

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:bg-brand-strong',
        secondary: 'border border-border bg-surface text-ink hover:bg-surface-muted',
        ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        danger: 'bg-danger text-on-danger hover:opacity-90'
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        icon: 'h-8 w-8'
      }
    },
    defaultVariants: DEFAULTS
  }
)

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  // data-slot, data-variant, data-size: hooks a theme sheet styles (ADR-035). before props, so a caller can override them.
  // they name what cva draws: its default when unset, nothing when null
  return (
    <Comp
      data-slot="button"
      data-variant={(variant === undefined ? DEFAULTS.variant : variant) ?? undefined}
      data-size={(size === undefined ? DEFAULTS.size : size) ?? undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

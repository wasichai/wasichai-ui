import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'
import { cn } from './cn'

// not modal by default: a modal menu locks the body (pointer-events: none) and an item that opens a
// dialog (a confirm) leaves it locked after the menu closes
export function DropdownMenu({ modal = false, ...props }: ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root modal={modal} {...props} />
}
export const DropdownMenuTrigger = MenuPrimitive.Trigger

// data-slot: the hook a theme sheet styles it by (ADR-035). before props, so a caller can override it
export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        data-slot="dropdown-menu"
        align="end"
        sideOffset={4}
        className={cn('z-50 min-w-40 rounded-md border border-border bg-surface-raised p-1 shadow-lg', className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({ className, variant, ...props }: ComponentProps<typeof MenuPrimitive.Item> & { variant?: 'danger' }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink outline-none',
        'data-[highlighted]:bg-brand-soft data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        variant === 'danger' && 'text-danger data-[highlighted]:bg-danger-soft',
        className
      )}
      {...props}
    />
  )
}

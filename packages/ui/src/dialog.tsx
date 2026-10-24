import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from './cn'
import { useScrollLock } from './scroll-lock'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  const { t } = useTranslation()

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-raised p-6 shadow-lg',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-muted"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

// not Radix's Overlay: it locks scroll through react-remove-scroll, whose injected <style> a strict CSP
// blocks (#58). this one locks it by CSSOM. the open dialog turns pointer events off on the body; the
// overlay takes them back (a React style is CSSOM too) so a click here still closes the dialog
function DialogOverlay() {
  useScrollLock()
  return <div data-slot="dialog-overlay" aria-hidden className="fixed inset-0 z-50 bg-overlay" style={{ pointerEvents: 'auto' }} />
}

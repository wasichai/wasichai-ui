import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

export interface ConfirmDialogProps {
  title: ReactNode
  description: ReactNode
  confirmLabel?: ReactNode // default t('common.delete')
  cancelLabel?: ReactNode // default t('common.cancel')
  variant?: 'danger' | 'primary' // default 'danger'
  busy?: boolean // confirm disabled while the action runs
  error?: ReactNode // under the description, role=alert
  onConfirm: () => void
  onCancel: () => void
}

// a question before something that cannot be undone. mounted open: the caller renders it only while asking.
// cancel, Escape, the X and a click outside all end in onCancel.
// data-slot: hook a theme sheet styles (ADR-035).
export function ConfirmDialog({ title, description, confirmLabel, cancelLabel, variant = 'danger', busy, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent data-slot="confirm-dialog" className="max-w-md">
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-ink-muted">{description}</DialogDescription>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button variant={variant} disabled={busy} onClick={onConfirm}>
            {confirmLabel ?? t('common.delete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Label, Textarea } from '@wasichai/ui'
import { CHANGE_REASON_MAX_LENGTH, normalizeReason, reasonProblem, type ReasonProblem } from '../../lib/changeReason'

export interface ReasonDialogProps {
  title?: ReactNode // default t('reason.title')
  description?: ReactNode // default t('reason.description')
  confirmLabel?: ReactNode // default t('reason.confirm')
  busy?: boolean // confirm disabled, textarea read-only
  error?: string | null // server message about the reason, under the textarea (role=alert)
  onConfirm: (reason: string) => void // trimmed, already valid
  onCancel: () => void // Cancel, Escape, X, outside click
}

// asks for the change reason of an object with requiresReason. mounted open, like ConfirmDialog:
// the caller renders it only while asking. checks what the server would refuse before anything is sent.
export function ReasonDialog({ title, description, confirmLabel, busy, error, onConfirm, onCancel }: ReasonDialogProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<ReasonProblem | null>(null)
  const messageId = useId()
  // the local problem is the newer news: a server error is about the text sent before
  const message = problem ? t(`reason.problems.${problem}`, { max: CHANGE_REASON_MAX_LENGTH }) : error

  const confirm = () => {
    const found = reasonProblem(text)
    setProblem(found)
    if (!found) onConfirm(normalizeReason(text) ?? '')
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent data-slot="reason-dialog" className="max-w-md">
        <DialogTitle className="text-lg font-semibold">{title ?? t('reason.title')}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-ink-muted">{description ?? t('reason.description')}</DialogDescription>
        <div className="mt-4 grid gap-1">
          <Label htmlFor="change-reason-dialog">{t('reason.label')}</Label>
          <Textarea
            id="change-reason-dialog"
            value={text}
            readOnly={busy}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            onChange={(event) => {
              setText(event.target.value)
              setProblem(null)
            }}
          />
          <div className="flex justify-between gap-2 text-xs text-ink-muted">
            <span>{t('reason.hint', { max: CHANGE_REASON_MAX_LENGTH })}</span>
            {/* code points, like the server counts them */}
            <span>{t('reason.count', { count: Array.from(text.trim()).length, max: CHANGE_REASON_MAX_LENGTH })}</span>
          </div>
          {message && (
            <p id={messageId} role="alert" className="text-sm text-danger">
              {message}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={busy} onClick={confirm}>
            {confirmLabel ?? t('reason.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

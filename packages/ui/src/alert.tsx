import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from './cn'

export type AlertTone = 'success' | 'warning' | 'danger' | 'notice'

export interface AlertProps {
  tone: AlertTone
  // bold, at the start: "Atención.", "La sesión caducó."
  title?: ReactNode
  // before the text, hidden from screen readers: the tone's role and the text say it. no default per tone, each app
  // picks its own, so a tone is not told by colour alone (WCAG 1.4.1)
  icon?: ReactNode
  children: ReactNode
  // shows a dismiss button (a check)
  onDismiss?: () => void
  // what the place adds to the classic look: a box, a margin, the alignment
  className?: string
}

// the classic look: the text in its tone's colour. a box is a theme sheet's (portal-tributario paints one by data-slot
// and data-tone), so light and dark stay text
const TEXT: Record<AlertTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  notice: 'text-notice'
}

// a message with a tone: danger interrupts (alert), the rest is announced politely (status)
export function Alert({ tone, title, icon, children, onDismiss, className }: AlertProps) {
  const { t } = useTranslation()
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      data-slot="alert"
      data-tone={tone}
      // with an icon a row: the icon one line high, the text wrapping beside it, not under it
      className={cn('text-sm', TEXT[tone], icon != null && 'flex items-start gap-2', className)}
    >
      {icon != null && (
        <span data-slot="alert-icon" aria-hidden className="inline-flex h-lh shrink-0 items-center">
          {icon}
        </span>
      )}
      <span data-slot="alert-text" className={icon != null ? 'min-w-0 flex-1' : undefined}>
        {title && <strong className="font-bold">{title}</strong>}
        {title && ' '}
        {children}
      </span>
      {onDismiss && (
        <button
          type="button"
          data-slot="alert-dismiss"
          aria-label={t('common.dismissAlert')}
          onClick={onDismiss}
          className="ml-2 inline-flex rounded p-0.5 align-middle opacity-80 hover:opacity-100"
        >
          <Check className="size-4" />
        </button>
      )}
    </div>
  )
}

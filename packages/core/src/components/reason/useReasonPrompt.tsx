import { useCallback, useState, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { ReasonDialog } from './ReasonDialog'

export interface ReasonPromptOptions {
  required: boolean
  title?: ReactNode
  description?: ReactNode
  confirmLabel?: ReactNode
}

export interface ReasonPrompt {
  // not required: write(undefined) runs at once. required: the dialog asks first; cancel = write never runs.
  withReason(write: (reason: string | undefined) => Promise<unknown>, options: ReasonPromptOptions): void
  dialog: ReactNode // render once where the caller draws
}

interface Pending {
  write: (reason: string | undefined) => Promise<unknown>
  options: ReasonPromptOptions
}

// a failed write is never rethrown: the caller passes mutation.mutateAsync and reads mutation.error
const swallow = () => {}

export function useReasonPrompt(): ReasonPrompt {
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withReason = useCallback((write: Pending['write'], options: ReasonPromptOptions) => {
    if (!options.required) {
      write(undefined).catch(swallow)
      return
    }
    setBusy(false)
    setError(null)
    setPending({ write, options })
  }, [])

  const confirm = async (current: Pending, reason: string) => {
    setBusy(true)
    setError(null)
    // only closes the prompt it answered: a cancel during the write may have opened another
    const close = () => setPending((open) => (open === current ? null : open))
    try {
      await current.write(reason)
      close()
    } catch (cause) {
      // a refused reason stays in the dialog to be fixed; anything else is the caller's banner
      const refused = cause instanceof ApiError ? cause.violations.find((violation) => violation.field === 'reason') : undefined
      if (refused) setError(refused.message)
      else close()
    } finally {
      setBusy(false)
    }
  }

  const dialog = pending ? (
    <ReasonDialog
      title={pending.options.title}
      description={pending.options.description}
      confirmLabel={pending.options.confirmLabel}
      busy={busy}
      error={error}
      onConfirm={(reason) => void confirm(pending, reason)}
      onCancel={() => setPending(null)}
    />
  ) : null

  return { withReason, dialog }
}

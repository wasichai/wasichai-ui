import { useCallback, useRef, useState, type ReactNode } from 'react'
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
  // the prompt on screen now: a write settling after its prompt was cancelled must not touch the next one
  const shown = useRef<Pending | null>(null)
  const show = useCallback((next: Pending | null) => {
    shown.current = next
    setPending(next)
  }, [])

  const withReason = useCallback(
    (write: Pending['write'], options: ReasonPromptOptions) => {
      if (!options.required) {
        write(undefined).catch(swallow)
        return
      }
      setBusy(false)
      setError(null)
      show({ write, options })
    },
    [show]
  )

  const confirm = async (current: Pending, reason: string) => {
    setBusy(true)
    setError(null)
    let refused: string | undefined
    try {
      await current.write(reason)
    } catch (cause) {
      // a refused reason stays in the dialog to be fixed; anything else is the caller's banner
      refused = cause instanceof ApiError ? cause.violations.find((violation) => violation.field === 'reason')?.message : undefined
    }
    // cancelled during the write, maybe another prompt open now: freeing its button would let it send twice
    if (shown.current !== current) return
    setBusy(false)
    if (refused !== undefined) setError(refused)
    else show(null)
  }

  const dialog = pending ? (
    <ReasonDialog
      title={pending.options.title}
      description={pending.options.description}
      confirmLabel={pending.options.confirmLabel}
      busy={busy}
      error={error}
      onConfirm={(reason) => void confirm(pending, reason)}
      onCancel={() => show(null)}
    />
  ) : null

  return { withReason, dialog }
}

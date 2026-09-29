import { Download, Loader2, Printer } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

export interface PdfFile {
  blob: Blob
  filename: string
}

export interface PdfDialogProps {
  // the dialog's and the embedded PDF's name: 'PU — 01-01-0001 — 2026'
  title: string
  // what to load: an api path, an id. a new one loads again
  source: string
  load: (source: string) => Promise<PdfFile>
  onClose: () => void
  // who opened it may act on a failure (pick another titular); it is shown all the same
  onError?: (error: unknown) => void
  // a failure's body; default: its message, or common.pdfFailed when it has none
  renderError?: (error: unknown) => ReactNode
}

type State = { status: 'loading' } | { status: 'ready'; url: string; filename: string } | { status: 'error'; error: unknown }

// a generated PDF (a tax slip, a receipt) embedded to see, print or download it. mounted open: the caller renders it only while
// showing it. its blob url lives while the dialog is open: it is revoked on closing, or when it is unmounted.
// data-slot: hook a theme sheet styles (ADR-035).
export function PdfDialog({ title, source, load, onClose, onError, renderError }: PdfDialogProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<State>({ status: 'loading' })
  const frame = useRef<HTMLIFrameElement>(null)
  const url = useRef<string | null>(null)
  // refs, not deps: an inline load or onError is a new function each render, and must not load again
  const loader = useRef(load)
  loader.current = load
  const onFail = useRef(onError)
  onFail.current = onError

  const revoke = () => {
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = null
  }

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    loader.current(source).then(
      ({ blob, filename }) => {
        // source changed or dialog gone while it loaded: drop it. no url made yet, so none to leak
        if (!live) return
        url.current = URL.createObjectURL(blob)
        setState({ status: 'ready', url: url.current, filename })
      },
      (error: unknown) => {
        if (!live) return
        setState({ status: 'error', error })
        onFail.current?.(error)
      }
    )
    return () => {
      live = false
      revoke()
    }
  }, [source])

  const close = () => {
    revoke()
    onClose()
  }
  const print = () => {
    const win = frame.current?.contentWindow
    win?.focus()
    win?.print()
  }

  const ready = state.status === 'ready' ? state : null

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent data-slot="pdf-dialog" className="flex h-[92vh] max-w-6xl flex-col">
        <DialogTitle className="pr-10 text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="sr-only">{t('common.pdfPreview')}</DialogDescription>
        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-surface-muted">
          {state.status === 'loading' && (
            <div role="status" className="flex h-full items-center justify-center gap-2 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" />
              {t('common.generating')}
            </div>
          )}
          {ready && <iframe ref={frame} title={title} src={ready.url} className="size-full border-0 bg-surface" />}
          {state.status === 'error' && (
            <div role="alert" className="space-y-1 p-6 text-sm text-danger">
              {renderError ? (
                renderError(state.error)
              ) : (
                // an empty message ('' status text over HTTP/2) says nothing: fall back to the generic line
                <p className="font-semibold">{(state.error instanceof Error && state.error.message) || t('common.pdfFailed')}</p>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={!ready} onClick={print}>
            <Printer className="size-4" />
            {t('common.print')}
          </Button>
          {ready ? (
            <Button asChild variant="secondary">
              <a href={ready.url} download={ready.filename}>
                <Download className="size-4" />
                {t('common.download')}
              </a>
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              <Download className="size-4" />
              {t('common.download')}
            </Button>
          )}
          <Button onClick={close}>{t('common.close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@wasichai/ui'
import { DocumentView } from './DocumentView'
import { useIssuedDocument } from './api'

// the browser makes the pdf: this page is plain html/css, window.print does the rest. one
// renderer (DocumentView) draws both the dialog and this page, so nothing can drift between them.
export function PrintableDocumentPage() {
  const { id } = useParams()
  const { t } = useTranslation(['documents', 'common'])
  const document = useIssuedDocument(id ?? null)
  const doc = document.data

  // browsers name the saved pdf after document.title. set it while this page is open, restore on unmount.
  useEffect(() => {
    if (!doc) return
    const previous = window.document.title
    window.document.title = doc.number
    return () => {
      window.document.title = previous
    }
  }, [doc])

  if (document.isLoading) {
    return <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
  }

  // deleted, or the fetch failed -- either way there is nothing to print, say so and stop
  if (!doc) {
    return <p className="p-8 text-sm text-ink-muted">{t('documents.print.unavailable')}</p>
  }

  return (
    <div className="min-h-screen bg-surface-muted print:bg-white">
      <div data-testid="print-toolbar" className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3 print:hidden">
        <span className="text-sm font-medium text-ink">{doc.number}</span>
        <Button size="sm" onClick={() => window.print()}>
          {t('documents.print.action')}
        </Button>
      </div>

      <div
        data-theme="light"
        className="document-sheet relative mx-auto my-8 w-[210mm] max-w-full bg-surface p-[20mm] shadow-lg print:my-0 print:w-auto print:p-0 print:shadow-none"
      >
        {doc.status === 'ARCHIVED' ? (
          // an archived document is still a real document handed to someone -- it must never read as valid on paper
          <div className="document-sheet-archived mb-6 rounded-md bg-danger px-4 py-2 text-center text-base font-bold uppercase tracking-wide text-on-danger">
            {t('documents.print.archived')}
          </div>
        ) : null}
        <DocumentView snapshot={doc.snapshot} />
      </div>
    </div>
  )
}

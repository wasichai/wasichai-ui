import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Printer } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@wasichai/ui'
import { DocumentView } from './DocumentView'
import { useIssuedDocument } from './api'
import { useWasichaiLinks } from '@wasichai/core'

// the body of an ISSUE history entry (core draws it through historyRenderers.ISSUE): a link to
// the document it named. opens the same dialog RecordDocuments uses to show a document -- one way
// to read a document, not two.
export function IssuedDocumentLink({ documentId }: { documentId: string }) {
  const { t } = useTranslation(['documents', 'common'])
  const links = useWasichaiLinks()
  const [open, setOpen] = useState(false)
  // fetched lazily: the timeline never pays for the snapshot unless the link is opened.
  const document = useIssuedDocument(open ? documentId : null)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        {t('history.viewDocument')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {document.isLoading ? (
            <p className="text-sm text-ink-muted">{t('common.loading')}</p>
          ) : document.data ? (
            <>
              <div className="flex items-center justify-between gap-2 pr-8">
                <DialogTitle>{document.data.number}</DialogTitle>
                <a
                  href={links.to('documents:print', { id: document.data.id })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('documents.print.link')}
                </a>
              </div>
              <DocumentView snapshot={document.data.snapshot} />
            </>
          ) : (
            // the document may since have been deleted, or the fetch failed. say so, no crash.
            <p className="text-sm text-ink-muted">{t('history.documentUnavailable')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

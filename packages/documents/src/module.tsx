import { FileSignature } from 'lucide-react'
import type { WasichaiModule, HistoryEntryProps, RecordPanelProps } from '@wasichai/core'
import { documentsMessages } from './i18n'
import { IssuedDocumentLink } from './IssuedDocumentLink'
import { RecordDocuments } from './RecordDocuments'

export const DOCUMENTS_MODULE_ID = 'documents'

export interface DocumentsModuleOptions {
  // url prefix of every route of the module. '' keeps the original app's /builder/documents and /documents/:id/print
  basePath?: string
}

// core hands the whole audit entry; the link needs only the document it names. old rows name none.
function IssueEntryBody({ entry }: HistoryEntryProps) {
  return entry.documentId ? <IssuedDocumentLink documentId={entry.documentId} /> : null
}

// core hands the loaded record; the panel fetches its documents by id
function RecordDocumentsPanel({ objectName, record }: RecordPanelProps) {
  return <RecordDocuments objectName={objectName} recordId={record.id} />
}

export function documentsModule(options: DocumentsModuleOptions = {}): WasichaiModule {
  return {
    id: DOCUMENTS_MODULE_ID,
    basePath: options.basePath ?? '',
    routes: [
      // lazy: the template editor is the only thing that pulls tiptap in
      { id: 'types', path: 'builder/documents', lazy: () => import('./DocumentTypesPage').then((m) => ({ default: m.DocumentTypesPage })) },
      // bare: the sheet prints without the app around it, but still needs a signed-in caller
      {
        id: 'print',
        path: 'documents/:id/print',
        chrome: 'bare',
        lazy: () => import('./PrintableDocumentPage').then((m) => ({ default: m.PrintableDocumentPage }))
      }
    ],
    nav: [{ group: 'builder', labelKey: 'documents:nav.documents', order: 30, icon: FileSignature, route: 'types' }],
    historyRenderers: {
      ISSUE: { body: IssueEntryBody, labelKey: 'documents:operations.ISSUE', tone: 'info' }
    },
    recordPanels: [RecordDocumentsPanel],
    i18n: documentsMessages
  }
}

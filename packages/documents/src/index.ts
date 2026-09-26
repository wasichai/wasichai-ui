export { DOCUMENTS_MODULE_ID, documentsModule, type DocumentsModuleOptions } from './module'
export { documentsMessages } from './i18n'
export { DocumentView } from './DocumentView'
export { IssuedDocumentLink } from './IssuedDocumentLink'
export { RecordDocuments } from './RecordDocuments'
export { useDeleteDocumentType, useDocumentTypes, useIssueDocument, useIssuedDocument, useRecordDocuments, useSaveDocumentType } from './api'
export type { DocumentSnapshot, DocumentType, DocumentTypePayload, IssuedDocument, RelatedTableSnapshot, TemplateNode } from './types'
// TemplateEditor and DocumentTypesPage stay out on purpose: they import tiptap, and only the lazy
// documents:types route may load it.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { DocumentView } from './DocumentView'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Dialog, DialogContent, DialogTitle } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { absoluteTime, useWasichaiLinks } from '@wasichai/core'
import { ApiError } from '@wasichai/core'
import { useDocumentTypes, useIssueDocument, useRecordDocuments } from './api'
import { cn } from '@wasichai/ui'
import type { IssuedDocument } from './types'

interface RecordDocumentsProps {
  objectName: string
  recordId: string
}

// the record's issued documents: history, not a form field. archived ones stay listed -- issuing
// again never deletes the one before it.
export function RecordDocuments({ objectName, recordId }: RecordDocumentsProps) {
  const { t } = useTranslation(['documents', 'common'])
  const links = useWasichaiLinks()
  const [typeName, setTypeName] = useState('')
  const [viewing, setViewing] = useState<IssuedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)

  const types = useDocumentTypes(objectName)
  const documents = useRecordDocuments(objectName, recordId)
  const issue = useIssueDocument(objectName, recordId)

  const submit = async () => {
    if (!typeName) return
    setError(null)
    try {
      const issued = await issue.mutateAsync(typeName)
      setTypeName('')
      setViewing(issued)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : String(cause))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>{t('documents.record.title')}</CardTitle>
        {(types.data ?? []).length > 0 ? (
          <div className="flex items-center gap-2">
            <Select value={typeName} onValueChange={setTypeName}>
              <SelectTrigger className="h-8 w-auto min-w-40 text-xs">
                <SelectValue placeholder={t('documents.record.chooseType')} />
              </SelectTrigger>
              <SelectContent>
                {(types.data ?? []).map((type) => (
                  <SelectItem key={type.name} value={type.name}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void submit()} disabled={!typeName || issue.isPending}>
              {t('documents.record.issue')}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-3">
        {error ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {documents.isLoading ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : (documents.data ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{t('documents.record.none')}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t('documents.record.number')}</Th>
                <Th>{t('documents.record.issuedAt')}</Th>
                <Th>{t('documents.record.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {documents.data!.map((document) => (
                <tr key={document.id} className="cursor-pointer hover:bg-surface-muted" onClick={() => setViewing(document)}>
                  <Td>{document.number}</Td>
                  <Td>{absoluteTime(document.issuedAt)}</Td>
                  <Td>
                    <Badge className={cn(document.status === 'ARCHIVED' && 'bg-surface-muted text-ink-muted')}>
                      {t(`documents.record.statuses.${document.status}`)}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>

      <Dialog open={Boolean(viewing)} onOpenChange={(next) => !next && setViewing(null)}>
        <DialogContent>
          {viewing ? (
            <>
              <div className="flex items-center justify-between gap-2 pr-8">
                <DialogTitle>{viewing.number}</DialogTitle>
                <a
                  href={links.to('documents:print', { id: viewing.id })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('documents.print.link')}
                </a>
              </div>
              <DocumentView snapshot={viewing.snapshot} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

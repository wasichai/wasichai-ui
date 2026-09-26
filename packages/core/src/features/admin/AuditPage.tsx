import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Table, Td, Th } from '@wasichai/ui'
import { useAuditLog } from '../history/api'
import { absoluteTime, describeChanges, relativeTime } from '../history/changes'
import { ChangeList } from '../history/ChangeList'
import { OperationBadge } from '../history/OperationBadge'
import { useAuditExtensions } from '../history/useAuditExtensions'
import type { AuditEntry, AuditOperation } from '../../types/audit'
import { useObjectDefinition, useObjects } from '../../queries'

const OPERATIONS: AuditOperation[] = ['CREATE', 'UPDATE', 'DELETE']
const LIMITS = [25, 50, 100, 200]
// radix selects refuse an empty value, so "no filter" needs a sentinel
const ANY = '__any__'

export function AuditPage() {
  const { t } = useTranslation()
  const [objectName, setObjectName] = useState(ANY)
  const [operation, setOperation] = useState(ANY)
  const [limit, setLimit] = useState(100)
  const { data: objects = [] } = useObjects()

  const {
    data = [],
    isLoading,
    isError
  } = useAuditLog({
    objectName: objectName === ANY ? undefined : objectName,
    operation: operation === ANY ? undefined : (operation as AuditOperation),
    limit
  })

  return (
    <>
      <PageHeader title={t('nav.audit')} subtitle={t('history.subtitle')} />
      <div className="space-y-5 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('history.filters')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="audit-object">{t('history.object')}</Label>
                <Select value={objectName} onValueChange={setObjectName}>
                  <SelectTrigger id="audit-object">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{t('history.allObjects')}</SelectItem>
                    {objects.map((object) => (
                      <SelectItem key={object.id} value={object.name}>
                        {object.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audit-operation">{t('history.operation')}</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger id="audit-operation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{t('history.allOperations')}</SelectItem>
                    {OPERATIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`history.operations.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audit-limit">{t('history.limit')}</Label>
                <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                  <SelectTrigger id="audit-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMITS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : isError ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('history.unavailable')}</p>
          ) : data.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.empty')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-px" />
                  <Th>{t('history.operation')}</Th>
                  <Th>{t('history.object')}</Th>
                  <Th>{t('history.record')}</Th>
                  <Th>{t('history.user')}</Th>
                  <Th>{t('history.occurredAt')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  // only an update carries changes, and only an open row needs the object metadata
  const expandable = entry.operation === 'UPDATE' && entry.changes.length > 0

  return (
    <>
      <tr className="hover:bg-surface-muted">
        <Td>
          {expandable ? (
            <Button variant="ghost" size="icon" aria-label={open ? t('history.hideChanges') : t('history.showChanges')} onClick={() => setOpen(!open)}>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : null}
        </Td>
        <Td>
          <OperationBadge operation={entry.operation} />
        </Td>
        <Td>{entry.objectName}</Td>
        <Td className="font-mono text-xs text-ink-muted">{entry.recordId ?? '—'}</Td>
        <Td>{entry.userEmail ?? t('history.system')}</Td>
        <Td className="text-xs text-ink-muted">
          <time dateTime={entry.occurredAt} title={absoluteTime(entry.occurredAt)}>
            {relativeTime(entry.occurredAt)}
          </time>
        </Td>
      </tr>
      {expandable && open ? (
        <tr>
          <Td colSpan={6} className="bg-surface-muted">
            <AuditRowChanges entry={entry} />
          </Td>
        </tr>
      ) : null}
    </>
  )
}

function AuditRowChanges({ entry }: { entry: AuditEntry }) {
  // labels need the object definition (cached by the rest of the app) and what modules say about their values
  const definition = useObjectDefinition(entry.objectName)
  const extensions = useAuditExtensions()
  return <ChangeList changes={describeChanges(entry, definition.data, extensions)} />
}

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@wasichai/ui'
import { ApiError, formError, type FieldViolation } from '../../api/client'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import { fallbackPage } from '../../components/page-renderer/fallbackPage'
import { PageRenderer } from '../../components/page-renderer/PageRenderer'
import { ErrorState } from '../../components/query-state/QueryState'
import { WritePolicyNotice } from '../../components/reason/WritePolicyNotice'
import { writePolicy } from '../../lib/writePolicy'
import { useObjectDefinition, useObjectRelationships, useRecord, useResolvedPage, useSaveRecord } from '../../queries'
import { PageHeader } from '../../shell/PageHeader'

// the detail page is metadata too: the server resolves which components go where, this only
// supplies the record and the save wiring. modules add panels under it.
export function RecordDetailPage() {
  const { object, id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const links = useWasichaiLinks()
  const { recordPanels } = useRegistry()
  const definition = useObjectDefinition(object)
  const record = useRecord(object, id)
  const page = useResolvedPage(object)
  const sides = useObjectRelationships(object)
  const save = useSaveRecord(object ?? '', id)
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<FieldViolation[]>([])

  // a 404 means no pages module on the server: draw the page the metadata alone gives (R8).
  // any other failure (500, 403, network) is a real outage: show it, do not silently swap the layout.
  const pageError = page.error instanceof ApiError ? page.error : null
  const notFound = pageError?.status === 404
  const resolved = page.data ?? (notFound && object && !sides.isLoading ? fallbackPage(object, sides.data ?? []) : undefined)
  const current = definition.data
  const item = record.data

  // checked before the loading guard below: a real page-fetch failure never resolves definition/record/
  // resolved, so the loading guard would spin forever instead of showing the error and its retry.
  if (page.isError && !notFound) {
    return (
      <div className="space-y-4 p-8">
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {pageError ? pageError.message : String(page.error)}
        </p>
        <Button variant="secondary" onClick={() => void page.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  // the record or its object failed (a link to a record deleted meanwhile is a 404): they never
  // arrive, so the loading guard below would wait for ever
  // a failed refetch keeps what is on screen: only a read that never arrived replaces the page
  const failed = definition.isError && !definition.data ? definition : record.isError && !record.data ? record : null
  if (failed) {
    return (
      <div className="p-8">
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      </div>
    )
  }

  if (!current || !item || !resolved) {
    return <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
  }

  return (
    <>
      <PageHeader
        title={`${current.label} · ${t('records.detail')}`}
        subtitle={item.id}
        actions={
          <Button variant="secondary" onClick={() => void navigate(links.records(current.name))}>
            {t('common.back')}
          </Button>
        }
      />
      {/* append-only or api-only: the forms read along, this says why */}
      <WritePolicyNotice policy={writePolicy(current)} className="mx-8 mt-4" />

      <PageRenderer
        page={resolved}
        definition={current}
        record={item}
        submitting={save.isPending}
        error={error}
        violations={violations}
        onSubmit={async (payload, reason) => {
          setError(null)
          setViolations([])
          try {
            await save.mutateAsync({ payload, reason })
          } catch (cause) {
            const refused = formError(cause)
            setError(refused.message)
            setViolations(refused.violations)
          }
        }}
      />

      {recordPanels.map((Panel, index) => (
        <Panel key={index} objectName={current.name} definition={current} record={item} />
      ))}
    </>
  )
}

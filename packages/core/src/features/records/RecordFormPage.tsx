import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Button, Card, CardBody } from '@wasichai/ui'
import { DynamicForm } from '../../components/dynamic-form/DynamicForm'
import { ErrorState } from '../../components/query-state/QueryState'
import { formError, type FieldViolation } from '../../api/client'
import { WritePolicyNotice } from '../../components/reason/WritePolicyNotice'
import { localizeDefinition } from '../../lib/localizedMetadata'
import { writePolicy } from '../../lib/writePolicy'
import { useObjectDefinition, useRecord, useSaveRecord } from '../../queries'
import { useRecordLinks, type RecordScreenProps } from './recordScreen'

export interface RecordFormPageProps extends RecordScreenProps {
  // the record to edit. absent = the route's :id; neither = a new record
  recordId?: string
}

// creates, or edits the record it is given. read only, an edit shows the record without a save and a
// create has nothing to show
export function RecordFormPage({ objectName, recordId, routes, readOnly = false }: RecordFormPageProps) {
  const params = useParams()
  const object = objectName ?? params.object
  const id = recordId ?? params.id
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const links = useRecordLinks(routes)
  const definition = useObjectDefinition(object)
  const record = useRecord(object, id)
  const save = useSaveRecord(object ?? '', id)
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<FieldViolation[]>([])

  // an object or a record that fails to load never arrives: say so rather than load for ever
  const failed = definition.isError && !definition.data ? definition : record.isError && !record.data ? record : null
  if (failed) {
    return (
      <div className="p-8">
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      </div>
    )
  }

  if (!definition.data || (id && !record.data)) {
    return <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
  }

  // the object's texts in the user's language (#140)
  const shown = localizeDefinition(definition.data, i18n.language)
  const header = <PageHeader title={`${t(id ? 'records.edit' : 'records.new')} · ${shown.label}`} subtitle={shown.description ?? undefined} />
  const policy = writePolicy(definition.data)
  const canSave = !readOnly && (id ? policy.canUpdate : policy.canCreate)
  const back = (
    <Button variant="secondary" onClick={() => void navigate(-1)}>
      {t('common.back')}
    </Button>
  )

  // the server refuses the create (403), or the screen is read only: say why instead of a form that only fails
  if (!id && !canSave) {
    return (
      <>
        {header}
        <div className="space-y-4 p-8">
          {readOnly ? <p className="text-sm text-ink-muted">{t('records.readOnly')}</p> : <WritePolicyNotice policy={policy} />}
          {back}
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="space-y-4 p-8">
        {/* an edit the object's rules refuse reads along, and this says why */}
        {id && !readOnly ? <WritePolicyNotice policy={policy} /> : null}
        <Card>
          <CardBody>
            <DynamicForm
              definition={definition.data}
              record={record.data}
              readOnly={!canSave}
              submitting={save.isPending}
              error={error}
              violations={violations}
              onCancel={() => void navigate(-1)}
              onSubmit={async (payload, reason) => {
                setError(null)
                setViolations([])
                try {
                  const saved = await save.mutateAsync({ payload, reason })
                  void navigate(links.record(object ?? '', saved.id))
                } catch (cause) {
                  const refused = formError(cause)
                  setError(refused.message)
                  setViolations(refused.violations)
                }
              }}
            />
          </CardBody>
        </Card>
        {/* a form that cannot save draws no buttons of its own */}
        {canSave ? null : back}
      </div>
    </>
  )
}

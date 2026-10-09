import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Button, Card, CardBody } from '@wasichai/ui'
import { DynamicForm } from '../../components/dynamic-form/DynamicForm'
import { ErrorState } from '../../components/query-state/QueryState'
import { formError, type FieldViolation } from '../../api/client'
import { WritePolicyNotice } from '../../components/reason/WritePolicyNotice'
import { writePolicy } from '../../lib/writePolicy'
import { useObjectDefinition, useSaveRecord } from '../../queries'
import { useWasichaiLinks } from '../../app/context'

export function RecordFormPage() {
  const { object } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const links = useWasichaiLinks()
  const definition = useObjectDefinition(object)
  const save = useSaveRecord(object ?? '')
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<FieldViolation[]>([])

  // an object that fails to load never arrives: say so rather than load for ever
  if (definition.isError && !definition.data) {
    return (
      <div className="p-8">
        <ErrorState error={definition.error} onRetry={() => void definition.refetch()} />
      </div>
    )
  }

  if (!definition.data) {
    return <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
  }

  const header = <PageHeader title={`${t('records.new')} · ${definition.data.label}`} subtitle={definition.data.description ?? undefined} />
  const policy = writePolicy(definition.data)

  // the server refuses the create (403): say why instead of a form that only fails
  if (!policy.canCreate) {
    return (
      <>
        {header}
        <div className="space-y-4 p-8">
          <WritePolicyNotice policy={policy} />
          <Button variant="secondary" onClick={() => void navigate(-1)}>
            {t('common.back')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="p-8">
        <Card>
          <CardBody>
            <DynamicForm
              definition={definition.data}
              submitting={save.isPending}
              error={error}
              violations={violations}
              onCancel={() => void navigate(-1)}
              onSubmit={async (payload, reason) => {
                setError(null)
                setViolations([])
                try {
                  const created = await save.mutateAsync({ payload, reason })
                  void navigate(links.record(object ?? '', created.id))
                } catch (cause) {
                  const refused = formError(cause)
                  setError(refused.message)
                  setViolations(refused.violations)
                }
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  )
}

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../shell/PageHeader'
import { Card, CardBody } from '@wasichai/ui'
import { DynamicForm } from '../../components/dynamic-form/DynamicForm'
import { ApiError } from '../../api/client'
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

  if (!definition.data) {
    return <p className="p-8 text-sm text-ink-muted">{t('common.loading')}</p>
  }

  return (
    <>
      <PageHeader title={`${t('records.new')} · ${definition.data.label}`} subtitle={definition.data.description ?? undefined} />
      <div className="p-8">
        <Card>
          <CardBody>
            <DynamicForm
              definition={definition.data}
              submitting={save.isPending}
              error={error}
              onCancel={() => void navigate(-1)}
              onSubmit={async (payload) => {
                setError(null)
                try {
                  const created = await save.mutateAsync(payload)
                  void navigate(links.record(object ?? '', created.id))
                } catch (cause) {
                  setError(cause instanceof ApiError ? [cause.message, ...cause.violations.map((v) => `${v.field}: ${v.message}`)].join(' — ') : String(cause))
                }
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Alert, Button } from '@wasichai/ui'
import { Card } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { DataTable } from '../../components/data-table/DataTable'
import { effectiveSort, fallbackView, pickView, viewColumns, viewQueryParams } from './viewColumns'
import { useDeleteRecord, useObjectDefinition, useRecords, useViews } from '../../queries'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import { describeError } from '../../api/client'

export function RecordListPage() {
  const { object } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const links = useWasichaiLinks()
  const { recordListActions } = useRegistry()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('')
  const [descending, setDescending] = useState(false)
  const [page, setPage] = useState(0)
  const [viewName, setViewName] = useState('')

  const definition = useObjectDefinition(object)
  const loaded = definition.data
  const fields = definition.data?.fields ?? []
  const views = useViews(object)
  // no stored view (or no server yet): metadata still gives us a usable list
  const view = pickView(views.data ?? [], viewName) ?? fallbackView(object ?? '', fields)

  const query = { page, search, sort, descending }
  const records = useRecords(object, viewQueryParams(view.definition, query))
  const remove = useDeleteRecord(object ?? '')

  const columns = viewColumns(view.definition, fields)
  const active = effectiveSort(view.definition, query)

  return (
    <>
      <PageHeader
        title={definition.data?.pluralLabel ?? object ?? ''}
        subtitle={definition.data?.description ?? undefined}
        actions={
          <>
            {(views.data ?? []).length > 0 ? (
              <div className="w-56">
                <Select
                  value={view.name}
                  onValueChange={(value) => {
                    setViewName(value)
                    // a view brings its own sort and page size: start over
                    setSort('')
                    setDescending(false)
                    setPage(0)
                  }}
                >
                  <SelectTrigger aria-label={t('views.selector')}>
                    <SelectValue placeholder={t('views.pick')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(views.data ?? []).map((candidate) => (
                      <SelectItem key={candidate.id || candidate.name} value={candidate.name}>
                        {candidate.label || candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {loaded && object ? recordListActions.map((ListAction, index) => <ListAction key={index} objectName={object} definition={loaded} />) : null}
            <Button asChild>
              <Link to={links.newRecord(object ?? '')}>
                <Plus className="h-4 w-4" />
                {t('records.new')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="p-8">
        <Card>
          {/* a refused delete (an append-only record points at it, no permission) says why */}
          {remove.isError ? (
            <Alert tone="danger" className="border-b border-border bg-danger-soft px-4 py-3" onDismiss={() => remove.reset()}>
              {describeError(remove.error)}
            </Alert>
          ) : null}
          <DataTable
            fields={fields}
            columns={columns.length > 0 ? columns : undefined}
            page={records.data}
            loading={records.isLoading || definition.isLoading}
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(0)
            }}
            sort={active.field}
            descending={active.descending}
            onSortChange={(field) => {
              // session only: the stored view keeps its own sort
              setDescending(active.field === field ? !active.descending : false)
              setSort(field)
              setPage(0)
            }}
            onPageChange={setPage}
            onOpen={(record) => void navigate(links.record(object ?? '', record.id))}
            onDelete={(record) => {
              if (window.confirm(t('common.confirmDelete'))) remove.mutate(record.id)
            }}
          />
        </Card>
      </div>
    </>
  )
}

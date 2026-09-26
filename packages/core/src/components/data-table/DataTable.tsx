import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { Button } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Table, Td, Th } from '@wasichai/ui'
import { cn } from '@wasichai/ui'
import { useRegistry } from '../../app/context'
import { FieldCell } from '../field-value'
import type { FieldMeta, Paged, RecordItem } from '../../types/metadata'

export interface DataTableProps {
  fields: FieldMeta[]
  // a view's columns, by field name and in its order. absent = pick them from metadata.
  columns?: string[]
  page?: Paged<RecordItem>
  loading?: boolean
  search: string
  onSearchChange: (value: string) => void
  sort: string
  descending: boolean
  onSortChange: (field: string) => void
  onPageChange: (page: number) => void
  onOpen: (record: RecordItem) => void
  onDelete?: (record: RecordItem) => void
}

// columns come from metadata, so this table renders any Custom Object.
export function DataTable({
  fields,
  columns,
  page,
  loading,
  search,
  onSearchChange,
  sort,
  descending,
  onSortChange,
  onPageChange,
  onOpen,
  onDelete
}: DataTableProps) {
  const { t } = useTranslation()
  const { fieldRenderers } = useRegistry()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const shown = selectColumns(fields, columns)
  const records = page?.content ?? []

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
          <Input className="pl-8" placeholder={t('common.search')} value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        {selected.size > 0 ? (
          <span className="text-xs text-ink-muted">
            {selected.size} / {records.length}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-ink-muted">{t('common.results', { count: page?.totalElements ?? 0 })}</span>
      </div>

      {loading ? (
        <p className="px-5 py-10 text-sm text-ink-muted">{t('common.loading')}</p>
      ) : records.length === 0 ? (
        <p className="px-5 py-10 text-sm text-ink-muted">{t('common.empty')}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-px">
                <input
                  type="checkbox"
                  aria-label="select all"
                  checked={selected.size === records.length && records.length > 0}
                  onChange={(event) => setSelected(event.target.checked ? new Set(records.map((r) => r.id)) : new Set())}
                />
              </Th>
              {shown.map((field) =>
                fieldRenderers[field.type] ? (
                  // a module-section field lives outside `attributes`; the server has nothing to sort it by
                  <Th key={field.id}>
                    <span className="inline-flex items-center gap-1">{field.label}</span>
                  </Th>
                ) : (
                  <Th key={field.id}>
                    <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => onSortChange(field.name)}>
                      {field.label}
                      {sort === field.name ? descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : null}
                    </button>
                  </Th>
                )
              )}
              <Th className="w-px">{t('common.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className={cn('cursor-pointer hover:bg-surface-muted', selected.has(record.id) && 'bg-brand-soft')}
                onClick={() => onOpen(record)}
              >
                <Td onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" aria-label={`select ${record.id}`} checked={selected.has(record.id)} onChange={() => toggle(record.id)} />
                </Td>
                {shown.map((field) => (
                  <Td key={field.id}>
                    <FieldCell field={field} record={record} fieldRenderers={fieldRenderers} />
                  </Td>
                ))}
                <Td onClick={(event) => event.stopPropagation()}>
                  {onDelete ? (
                    <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => onDelete(record)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {page && page.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-ink-muted">{t('common.page', { page: page.page + 1, total: page.totalPages })}</span>
          <Button variant="secondary" size="icon" aria-label="previous" disabled={page.page === 0} onClick={() => onPageChange(page.page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="next" disabled={page.page + 1 >= page.totalPages} onClick={() => onPageChange(page.page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

// a view may name a field that was deleted meanwhile: skip it rather than render a hole
function selectColumns(fields: FieldMeta[], columns?: string[]): FieldMeta[] {
  if (!columns) return fields.filter((field) => field.visible).slice(0, 8)
  const byName = new Map(fields.map((field) => [field.name, field]))
  return columns.map((name) => byName.get(name)).filter((field): field is FieldMeta => field !== undefined)
}

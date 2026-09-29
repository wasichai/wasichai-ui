import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'

const DEFAULT_SIZES = [5, 10, 25] as const

// server paging: the backend owns the page, so the arrows show only when there is more than one.
// data-slot, data-mode: hooks a theme sheet styles (ADR-035). the two footers differ, hence the mode.
export function Pagination({
  page,
  totalPages,
  totalElements,
  onPage
}: {
  page: number
  totalPages: number
  totalElements: number
  onPage: (page: number) => void
}) {
  const { t } = useTranslation()

  return (
    <div data-slot="pagination" data-mode="server" className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm text-ink-muted">
      <span>{t('common.records', { count: totalElements })}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span>{t('common.page', { page: page + 1, total: totalPages })}</span>
          <Button variant="secondary" size="icon" aria-label={t('common.previousPage')} disabled={page === 0} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="secondary" size="icon" aria-label={t('common.nextPage')} disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// client paging: the app holds every row and slices it. "Rows [10]" on the left, "1 a 10 de 47 registros < >" on the right.
// page is zero-based, like the backend's
export function PageSizePagination({
  page,
  size,
  total,
  onPage,
  onSize,
  sizes = DEFAULT_SIZES
}: {
  page: number
  size: number
  total: number
  onPage: (page: number) => void
  onSize: (size: number) => void
  sizes?: readonly number[]
}) {
  const { t } = useTranslation()
  // no rows: "0 a 0", not "1 a 0"
  const from = total === 0 ? 0 : page * size + 1
  const to = Math.min(total, (page + 1) * size)
  const last = Math.max(0, Math.ceil(total / size) - 1)

  return (
    <div
      data-slot="pagination"
      data-mode="client"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-sm text-ink-muted"
    >
      <label className="flex items-center gap-2">
        {t('common.rows')}
        {/* Input's look on a native select, until the library has one */}
        <select
          data-slot="native-select"
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          className="h-8 w-20 rounded-md border border-border bg-surface px-3 text-sm text-ink"
        >
          {sizes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <span>{t('common.range', { from, to, count: total })}</span>
        <Button variant="ghost" size="icon" aria-label={t('common.previousPage')} disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={t('common.nextPage')} disabled={page >= last} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

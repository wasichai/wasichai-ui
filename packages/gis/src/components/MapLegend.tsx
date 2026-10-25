import { useTranslation } from 'react-i18next'
import { cn } from '@wasichai/ui'
import { OTHER_COLOR, type LegendItem } from '../lib/style'

export interface MapLegendProps {
  items: LegendItem[]
  title?: string
  // the grey swatch for what no class matches; on by default, as the SLD paints it too
  showOther?: boolean
  className?: string
}

// swatches and labels of a styled map. nothing to show, nothing drawn.
export function MapLegend({ items, title, showOther = true, className }: MapLegendProps) {
  const { t } = useTranslation('gis')
  if (items.length === 0) return null
  const heading = title ?? t('style.legend')
  const rows = showOther ? [...items, { label: t('style.other'), color: OTHER_COLOR }] : items
  return (
    <figure className={cn('text-sm', className)} aria-label={heading}>
      <figcaption className="mb-2 font-medium text-ink">{heading}</figcaption>
      <ul className="space-y-1">
        {rows.map((item) => (
          <li key={`${item.label}-${item.color}`} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-border" style={{ backgroundColor: item.color }} />
            <span className="text-ink-muted">{item.label}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

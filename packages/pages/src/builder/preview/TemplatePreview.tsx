import { useTranslation } from 'react-i18next'
import { regionStyle } from '@wasichai/core'
import { cn } from '@wasichai/ui'
import type { PageTemplate } from '@wasichai/core'

export interface TemplatePreviewProps {
  template: PageTemplate
  // print each region's name inside its box, not just draw the box
  labels?: boolean
  // name of one region to call out, e.g. where an orphaned component is about to land
  highlight?: string
  className?: string
}

// draws a template from its own row/span data: boxes and tailwind, no shipped artwork. reused by
// the picker's thumbnails, the picker's detail panel, the settings-card summary and the
// orphan-relocation step (via `highlight`).
//
// PURE ON PURPOSE: no fetch, no state, no effect, props in, jsx out.
//
// NO INTERACTIVE ELEMENT, EVER: this renders inside a <button aria-pressed> in the picker, and a
// focusable element inside a button is invalid html — the DOM just misbehaves, react will not warn.
// do not add a button, link, input, select or tabindex here.
export function TemplatePreview({ template, labels, highlight, className }: TemplatePreviewProps) {
  const { t } = useTranslation(['pages', 'common'])

  return (
    <div className={cn('space-y-1', className)}>
      {template.rows.map((row, index) => (
        // preview never stacks to a column: it is a small fixed-size drawing, not a responsive page
        <div key={index} className="flex gap-1">
          {row.regions.map((region) => (
            <div
              key={region.name}
              data-region={region.name}
              style={regionStyle(region.span)}
              className={cn(
                'min-h-8 rounded border border-dashed border-border bg-surface-muted p-1',
                highlight === region.name && 'border-brand bg-brand-soft'
              )}
            >
              {labels ? (
                <span className="block truncate text-[10px] text-ink-muted">{t(`pages.regions.${region.name}`, { defaultValue: region.name })}</span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

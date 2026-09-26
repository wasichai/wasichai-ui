import { useTranslation } from 'react-i18next'
import type { ObjectDefinition, PageComponent } from '@wasichai/core'
import { geometryFields } from '../lib/geo'
import { componentGeometry, fieldGeometry } from '../types'

// what a MAP would show, from metadata already in hand: never mounts a map inside the draggable canvas
export function MapPreview({ component, definition }: { component: PageComponent; definition: ObjectDefinition }) {
  const { t } = useTranslation(['gis', 'common'])
  const target = componentGeometry(component)

  if (!target) {
    return (
      <div className="flex h-40 items-center justify-center rounded border border-border bg-surface-muted text-center text-sm text-ink-muted">
        {t('pages.mockMap.allGeometries')}
      </div>
    )
  }

  const targeted = geometryFields(definition).find((field) => field.name === target)
  return (
    <div className="flex h-40 items-center justify-center rounded border border-border bg-surface-muted text-center text-sm">
      {targeted ? (
        <span className="text-ink-muted">
          <span className="block font-medium text-ink">{targeted.label}</span>
          <span className="block text-xs">
            {targeted.name} · {fieldGeometry(targeted)?.type ?? ''}
          </span>
        </span>
      ) : (
        <span className="text-danger">{target}</span>
      )}
    </div>
  )
}

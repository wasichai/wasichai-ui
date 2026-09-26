import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PageComponentProps } from '@wasichai/core'
import { Card, CardHeader, CardTitle } from '@wasichai/ui'
import { MapView } from '../components/LazyMapView'
import { featureIdOf, geometryFields } from '../lib/geo'
import { componentGeometry, recordGeometries, type FeatureCollection } from '../types'

export function MapComponent({ component, definition, record }: PageComponentProps) {
  const { t } = useTranslation(['gis', 'common'])
  const target = componentGeometry(component)
  // the component may target one geometry; without a target it draws them all
  const targeted = target ? geometryFields(definition).filter((field) => field.name === target) : geometryFields(definition)

  // a fresh object every render would make MapView refit its bounds on every parent re-render, not
  // just when the record's shapes actually change
  const featureCollection = useMemo<FeatureCollection>(() => {
    const geometries = recordGeometries(record)
    const fields = target ? geometryFields(definition).filter((field) => field.name === target) : geometryFields(definition)
    // a spatial object with nothing drawn yet gets an empty map, not an excuse
    const drawn = fields.filter((field) => geometries[field.name])
    return {
      type: 'FeatureCollection',
      // one feature per geometry: a record with a plot and an access point is two shapes
      features: drawn.map((field) => ({
        type: 'Feature' as const,
        id: featureIdOf(record.id, field.name),
        geometry: geometries[field.name] ?? null,
        properties: { ...record.attributes, __geometry: field.label }
      }))
    }
    // definition is the object's metadata, not the record's data: it identifies which fields are
    // geometries, but not what a re-render should refit bounds for
  }, [record, target])

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{component.title ?? t('map.title')}</CardTitle>
      </CardHeader>
      <div className="h-[28rem]">
        {targeted.length ? <MapView featureCollection={featureCollection} /> : <p className="px-5 py-8 text-sm text-ink-muted">{t('records.noGeometry')}</p>}
      </div>
    </Card>
  )
}

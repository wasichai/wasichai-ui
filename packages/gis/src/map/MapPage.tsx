import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@wasichai/core'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { MapView } from '../components/LazyMapView'
import { geometryFields } from '../lib/geo'
import { useObjectDefinition, useObjects } from '@wasichai/core'
import { useFeatures } from '../api'
import { objectGeometry, type Feature } from '../types'

export function MapPage() {
  const { t } = useTranslation(['gis', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: objects = [] } = useObjects()
  const geoObjects = objects.filter((item) => objectGeometry(item) !== null)
  const [selected, setSelected] = useState<Feature | null>(null)

  const current = searchParams.get('object') ?? ''
  useEffect(() => {
    if (!current && geoObjects.length > 0) {
      setSearchParams({ object: geoObjects[0].name }, { replace: true })
    }
  }, [current, geoObjects, setSearchParams])

  // an object may carry several geometries and a map draws one at a time
  const definition = useObjectDefinition(current || undefined)
  const geometries = definition.data ? geometryFields(definition.data) : []
  const geometry = searchParams.get('geometry') ?? geometries[0]?.name ?? ''
  const features = useFeatures(current || undefined, geometry || undefined)

  return (
    <>
      <PageHeader
        title={t('map.title')}
        subtitle={t('map.features', { count: features.data?.features.length ?? 0 })}
        actions={
          <div className="flex gap-2">
            <div className="w-56">
              <Select
                value={current}
                onValueChange={(value) => {
                  setSelected(null)
                  setSearchParams({ object: value })
                }}
              >
                <SelectTrigger aria-label={t('map.selectObject')}>
                  <SelectValue placeholder={t('map.selectObject')} />
                </SelectTrigger>
                <SelectContent>
                  {geoObjects.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.pluralLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {geometries.length > 1 ? (
              <div className="w-44">
                <Select
                  value={geometry}
                  onValueChange={(value) => {
                    setSelected(null)
                    setSearchParams({ object: current, geometry: value })
                  }}
                >
                  <SelectTrigger aria-label={t('map.geometryColumn')}>
                    <SelectValue placeholder={t('map.geometryColumn')} />
                  </SelectTrigger>
                  <SelectContent>
                    {geometries.map((field) => (
                      <SelectItem key={field.id} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-5 p-8 lg:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden">
          <div className="h-[34rem]">
            <MapView featureCollection={features.data} onFeatureClick={setSelected} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('map.attributes')}</CardTitle>
          </CardHeader>
          <CardBody>
            {selected ? (
              <dl className="space-y-2 text-sm">
                {Object.entries(selected.properties)
                  .filter(([key]) => !key.startsWith('__') && key !== 'id')
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{key}</dt>
                      <dd className="text-right text-ink">{value == null ? '—' : String(value)}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-sm text-ink-muted">{t('common.empty')}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}

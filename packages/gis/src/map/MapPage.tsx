import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Save, Upload } from 'lucide-react'
import { PageHeader, describeError } from '@wasichai/core'
import { Alert, Button, Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { MapView } from '../components/LazyMapView'
import { MapLegend } from '../components/MapLegend'
import { geometryFields } from '../lib/geo'
import { DEFAULT_CLASSES, MAX_CLASSES, MIN_CLASSES, styleFromParams, styleParams, styleTypeFor, type AttributeStyle } from '../lib/style'
import { useObjectDefinition, useObjects } from '@wasichai/core'
import { useAttributeStyle, useFeatures } from '../api'
import { usePublishLayer } from '../layers/api'
import { useMapView } from '../mapViews/api'
import { SaveMapViewDialog } from '../mapViews/SaveMapViewDialog'
import { objectGeometry, type Feature } from '../types'

// a select cannot hold an empty value
const NO_STYLE = '__none'
const CLASS_COUNTS = Array.from({ length: MAX_CLASSES - MIN_CLASSES + 1 }, (_, index) => MIN_CLASSES + index)

export function MapPage() {
  const { t } = useTranslation(['gis', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: objects = [] } = useObjects()
  const geoObjects = objects.filter((item) => objectGeometry(item) !== null)
  const [selected, setSelected] = useState<Feature | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const current = searchParams.get('object') ?? ''
  const viewName = searchParams.get('view') ?? undefined
  useEffect(() => {
    if (!current && geoObjects.length > 0) {
      setSearchParams({ object: geoObjects[0].name }, { replace: true })
    }
  }, [current, geoObjects, setSearchParams])

  // a saved view opens with its geometry and style in the url, so changing them is just changing the map
  const savedView = useMapView(current || undefined, viewName)
  useEffect(() => {
    const view = savedView.data
    if (!view || searchParams.get('geometry') || searchParams.get('by')) return
    setSearchParams({ object: view.objectName, view: view.name, geometry: view.geometryName, ...styleParams(view.style) }, { replace: true })
  }, [savedView.data, searchParams, setSearchParams])

  // an object may carry several geometries and a map draws one at a time
  const definition = useObjectDefinition(current || undefined)
  const geometries = definition.data ? geometryFields(definition.data) : []
  const geometry = searchParams.get('geometry') ?? geometries[0]?.name ?? ''
  const features = useFeatures(current || undefined, geometry || undefined)

  // only the fields a style can colour by, each with the one kind of style it fits
  const stylable = (definition.data?.fields ?? []).filter((field) => styleTypeFor(field.type) !== null)
  const style = styleFromParams(searchParams)
  const styled = useAttributeStyle(current || undefined, style)
  const publish = usePublishLayer()

  // every change keeps the object, the geometry and the view being edited
  const navigate = (next: { geometry?: string; style?: AttributeStyle | null }) => {
    setNotice(null)
    const params: Record<string, string> = { object: current }
    if (viewName) params.view = viewName
    const nextGeometry = next.geometry ?? searchParams.get('geometry')
    if (nextGeometry) params.geometry = nextGeometry
    setSearchParams({ ...params, ...styleParams(next.style === undefined ? style : next.style) })
  }

  const pickField = (value: string) => {
    const field = stylable.find((item) => item.name === value)
    const type = field ? styleTypeFor(field.type) : null
    navigate({ style: field && type ? { by: field.name, type, ...(type === 'quantiles' ? { classes: DEFAULT_CLASSES } : {}) } : null })
  }

  const publishStyled = async () => {
    if (!style || !geometry) return
    setNotice(null)
    try {
      await publish.mutateAsync({ objectName: current, geometryName: geometry, style })
      setNotice({ tone: 'success', text: t('map.publishedStyled') })
    } catch (cause) {
      setNotice({ tone: 'danger', text: describeError(cause) })
    }
  }

  return (
    <>
      <PageHeader
        title={savedView.data?.label ?? t('map.title')}
        subtitle={t('map.features', { count: features.data?.features.length ?? 0 })}
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="w-56">
              <Select
                value={current}
                onValueChange={(value) => {
                  setSelected(null)
                  setNotice(null)
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
                    navigate({ geometry: value })
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
            {stylable.length > 0 ? (
              <div className="w-48">
                <Select value={style?.by ?? NO_STYLE} onValueChange={pickField}>
                  <SelectTrigger aria-label={t('style.colorBy')}>
                    <SelectValue placeholder={t('style.colorBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_STYLE}>{t('style.none')}</SelectItem>
                    {stylable.map((field) => (
                      <SelectItem key={field.id} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {style?.type === 'quantiles' ? (
              <div className="w-28">
                <Select value={String(style.classes ?? DEFAULT_CLASSES)} onValueChange={(value) => navigate({ style: { ...style, classes: Number(value) } })}>
                  <SelectTrigger aria-label={t('style.classes')}>
                    <SelectValue placeholder={t('style.classes')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_COUNTS.map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {current && geometry ? (
              <Button variant="secondary" onClick={() => setSaving(true)}>
                <Save className="h-4 w-4" />
                {t('map.saveView')}
              </Button>
            ) : null}
            {style && geometry ? (
              <Button variant="secondary" disabled={publish.isPending} onClick={publishStyled}>
                <Upload className="h-4 w-4" />
                {t('map.publishStyled')}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-5 p-8 lg:grid-cols-[1fr_20rem]">
        {notice || styled.error || savedView.isError ? (
          <div className="grid gap-2 lg:col-span-2">
            {savedView.isError ? <Alert tone="danger">{t('mapViews.notFound')}</Alert> : null}
            {styled.error ? <Alert tone="danger">{`${t('style.loadError')}: ${describeError(styled.error)}`}</Alert> : null}
            {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <div className="h-[34rem]">
            <MapView featureCollection={features.data} featureStyle={styled.featureStyle} onFeatureClick={setSelected} />
          </div>
          {styled.legend.length > 0 ? (
            <div className="border-t border-border px-5 py-4">
              <MapLegend items={styled.legend} />
            </div>
          ) : null}
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

      {saving ? (
        <SaveMapViewDialog
          objectName={current}
          geometryName={geometry}
          style={style}
          initial={savedView.data ? { name: savedView.data.name, label: savedView.data.label } : undefined}
          onCancel={() => setSaving(false)}
          onSaved={(view) => {
            setSaving(false)
            setSearchParams({ object: view.objectName, view: view.name, geometry: view.geometryName, ...styleParams(view.style) })
          }}
        />
      ) : null}
    </>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CloudOff, Copy, Eye, EyeOff, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { MapView } from '../components/LazyMapView'
import { describeError } from '@wasichai/core'
import { useObjects } from '@wasichai/core'
import { useGeoServerServices, useLayers, usePublishLayer, useUnpublishLayer } from './api'
import type { LayerStatus } from './types'
import type { ObjectSummary } from '@wasichai/core'
import { objectGeometry } from '../types'

interface RowError {
  key: string
  message: string
}

// the object alone stopped being a layer's identity, so everything keyed on it takes both halves
function keyOf(row: { objectName: string; geometryName: string }): string {
  return `${row.objectName}/${row.geometryName}`
}

export function LayersPage() {
  const { t } = useTranslation(['gis', 'common'])
  const services = useGeoServerServices()
  const layers = useLayers()
  const { data: objects = [] } = useObjects()
  const publish = usePublishLayer()
  const unpublish = useUnpublishLayer()
  const [preview, setPreview] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<RowError | null>(null)

  // geoserver down or the endpoint missing: still list what could be published
  const enabled = services.data?.enabled === true
  const rows = layers.data ?? objects.filter((item) => objectGeometry(item) !== null).map(unpublishedRow)
  const previewed = rows.find((row) => keyOf(row) === preview && row.published) ?? null

  const run = async (row: LayerStatus, action: 'publish' | 'unpublish') => {
    setError(null)
    const key = keyOf(row)
    try {
      await (action === 'publish' ? publish : unpublish).mutateAsync({ objectName: row.objectName, geometryName: row.geometryName })
      if (action === 'unpublish' && preview === key) setPreview(null)
    } catch (cause) {
      setError({ key, message: describeError(cause) })
    }
  }

  const copy = async (value: string) => {
    // undefined outside a secure context, and in jsdom
    if (!navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
    } catch {
      setCopied(null)
    }
  }

  return (
    <>
      <PageHeader title={t('layers.title')} subtitle={t('layers.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('layers.services')}</CardTitle>
          </CardHeader>
          <CardBody>
            {services.isLoading ? (
              <p className="text-sm text-ink-muted">{t('common.loading')}</p>
            ) : enabled ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-muted">{t('layers.endpoint')}</dt>
                  <dd className="font-mono text-xs text-ink">{services.data?.url}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-muted">{t('layers.workspace')}</dt>
                  <dd className="font-mono text-xs text-ink">{services.data?.workspace}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-muted">{t('layers.status')}</dt>
                  <dd>
                    <Badge>{t('layers.connected')}</Badge>
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="flex items-start gap-3" role="status">
                <CloudOff className="mt-0.5 h-5 w-5 text-danger" />
                <div>
                  <p className="text-sm font-medium text-ink">{t('layers.offline')}</p>
                  <p className="text-sm text-ink-muted">{t('layers.offlineHint')}</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          {layers.isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('layers.empty')}</p>
          ) : (
            <>
              {layers.isError ? <p className="px-5 pt-4 text-sm text-ink-muted">{t('layers.listError')}</p> : null}
              <Table>
                <thead>
                  <tr>
                    <Th>{t('layers.object')}</Th>
                    <Th>{t('layers.technicalName')}</Th>
                    <Th>{t('layers.geometryType')}</Th>
                    <Th>{t('layers.srid')}</Th>
                    <Th>{t('layers.status')}</Th>
                    <Th>{t('layers.layerName')}</Th>
                    <Th>
                      {t('layers.wms')} / {t('layers.wfs')}
                    </Th>
                    <Th className="w-px" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = keyOf(row)
                    const pending = (publish.isPending || unpublish.isPending) && error?.key !== key && preview !== key
                    return (
                      <tr key={key} className="hover:bg-surface-muted">
                        <Td className="font-medium">{row.label}</Td>
                        <Td className="font-mono text-xs">
                          {row.objectName}
                          <span className="text-ink-muted">.{row.geometryName}</span>
                        </Td>
                        <Td className="text-xs">{row.geometryType}</Td>
                        <Td className="font-mono text-xs">EPSG:{row.srid}</Td>
                        <Td>
                          <Badge className={row.published ? undefined : 'bg-surface-muted text-ink-muted'}>
                            {row.published ? t('layers.published') : t('layers.unpublished')}
                          </Badge>
                        </Td>
                        <Td className="font-mono text-xs text-ink-muted">{row.published ? row.layerName : '—'}</Td>
                        <Td>
                          {row.published ? (
                            <div className="space-y-1">
                              <Endpoint kind={t('layers.wms')} url={row.wms} copied={copied === row.wms} label={t('layers.copy')} onCopy={copy} />
                              <Endpoint kind={t('layers.wfs')} url={row.wfs} copied={copied === row.wfs} label={t('layers.copy')} onCopy={copy} />
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                            {row.published ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={preview === key ? t('layers.hidePreview') : t('layers.preview')}
                                onClick={() => setPreview(preview === key ? null : key)}
                              >
                                {preview === key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            ) : null}
                            {row.published ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={!enabled || pending}
                                onClick={() => {
                                  if (window.confirm(t('layers.confirmUnpublish'))) {
                                    void run(row, 'unpublish')
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('layers.unpublish')}
                              </Button>
                            ) : (
                              <Button size="sm" disabled={!enabled || pending} onClick={() => void run(row, 'publish')}>
                                <Upload className="h-4 w-4" />
                                {t('layers.publish')}
                              </Button>
                            )}
                          </div>
                          {error?.key === key ? <p className="mt-1 text-right text-xs text-danger">{error.message}</p> : null}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </>
          )}
        </Card>

        {previewed ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>
                {t('layers.previewTitle')} — {previewed.layerName}
              </CardTitle>
            </CardHeader>
            <div className="h-[28rem]">
              <MapView wmsLayers={[{ id: previewed.layerName, url: previewed.wms, opacity: 0.85 }]} />
            </div>
          </Card>
        ) : null}
      </div>
    </>
  )
}

function Endpoint({ kind, url, copied, label, onCopy }: { kind: string; url: string; copied: boolean; label: string; onCopy: (url: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-9 shrink-0 text-xs font-semibold text-ink-muted">{kind}</span>
      <span className="max-w-[18rem] truncate font-mono text-xs text-ink" title={url}>
        {url}
      </span>
      <Button variant="ghost" size="icon" aria-label={`${label} ${kind}`} onClick={() => onCopy(url)}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

// no layer status from the backend: show the object as something publishable
// the fallback when geoserver cannot be reached: the object listing knows its first geometry only
function unpublishedRow(object: ObjectSummary): LayerStatus {
  return {
    objectName: object.name,
    geometryName: 'geom',
    label: object.label,
    layerName: object.name,
    geometryType: objectGeometry(object)?.type ?? '',
    srid: objectGeometry(object)?.srid ?? 4326,
    published: false,
    wms: '',
    wfs: ''
  }
}

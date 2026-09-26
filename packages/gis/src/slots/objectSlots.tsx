import { Map as MapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardCardProps, ObjectDetailProps } from '@wasichai/core'
import { Badge, Card, CardBody } from '@wasichai/ui'
import { objectGeometry } from '../types'

// dashboard: how many objects are spatial
export function GeoObjectsCard({ objects, loading }: DashboardCardProps) {
  const { t } = useTranslation(['gis', 'common'])
  const spatial = objects.filter((item) => objectGeometry(item) !== null)
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 text-ink-muted">
          <MapIcon className="h-4 w-4" />
          <span className="text-sm">{t('dashboard.geoObjects')}</span>
        </div>
        <p className="mt-2 text-3xl font-semibold text-ink">{loading ? '—' : spatial.length}</p>
      </CardBody>
    </Card>
  )
}

// objects page: the geometry column's cell
export function GeometryCell({ object }: ObjectDetailProps) {
  const { t } = useTranslation(['gis', 'common'])
  const geometry = objectGeometry(object)
  return geometry ? (
    <Badge>
      {geometry.type} · EPSG:{geometry.srid}
    </Badge>
  ) : (
    <span className="text-xs text-ink-muted">{t('objects.noGeometry')}</span>
  )
}

// dashboard: the line under each object tile
export function GeometryTileDetail({ object }: ObjectDetailProps) {
  const { t } = useTranslation(['gis', 'common'])
  const geometry = objectGeometry(object)
  return <p className="mt-0.5 text-xs text-ink-muted">{geometry ? `${geometry.type} · EPSG:${geometry.srid}` : t('objects.noGeometry')}</p>
}

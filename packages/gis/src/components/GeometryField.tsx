import { useTranslation } from 'react-i18next'
import { Button } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { MapView } from './LazyMapView'
import { drawModeFor } from '../lib/geo'
import type { GeoJsonGeometry } from '../types'

interface GeometryFieldProps {
  // the field's own name and label: an object may carry several, and "Geometría" would name none
  name: string
  label: string
  geometryType: string
  srid: number
  value: GeoJsonGeometry | null
  onChange: (geometry: GeoJsonGeometry | null) => void
}

export function GeometryField({ name, label, geometryType, srid, value, onChange }: GeometryFieldProps) {
  const { t } = useTranslation(['gis', 'common'])
  const mode = drawModeFor(geometryType)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>
          {label}
          <span className="ml-2 text-xs font-normal text-ink-muted">
            {geometryType} · EPSG:{srid}
          </span>
        </Label>
        <Button type="button" variant="ghost" size="sm" aria-label={`${t('map.clear')} ${name}`} onClick={() => onChange(null)}>
          {t('map.clear')}
        </Button>
      </div>
      <div className="h-80 overflow-hidden rounded-card border border-border">
        <MapView
          drawMode={mode}
          drawValue={value}
          onDrawChange={onChange}
          featureCollection={value ? { type: 'FeatureCollection', features: [{ type: 'Feature', id: name, geometry: value, properties: {} }] } : null}
        />
      </div>
      <p className="text-xs text-ink-muted">{value ? `${value.type} ✓` : t('map.drawHint')}</p>
    </div>
  )
}

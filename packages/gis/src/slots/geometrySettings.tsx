import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { FieldSettingsProps } from '@wasichai/core'
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'

export const GEOMETRY_TYPES = ['POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON'] as const

export const GEOMETRY_SETTING_DEFAULTS: Record<string, string> = { geometryType: 'POLYGON', srid: '4326' }

// the object/field POST reads geometryType and srid. dimension is the server's call: never sent.
export function geometryPayload(settings: Record<string, string>): Record<string, unknown> {
  return { geometryType: settings.geometryType, srid: Number(settings.srid) || 4326 }
}

export function GeometrySettingsEditor({ settings, onChange }: FieldSettingsProps) {
  const { t } = useTranslation(['gis', 'common'])
  const sridId = useId()

  return (
    <div className="grid gap-3 sm:col-span-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>{t('objects.geometry')}</Label>
        <Select value={settings.geometryType} onValueChange={(value) => onChange({ geometryType: value })}>
          <SelectTrigger aria-label={t('objects.geometry')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GEOMETRY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={sridId}>{t('objects.crs')}</Label>
        <Input
          id={sridId}
          inputMode="numeric"
          value={settings.srid ?? ''}
          onChange={(event) => onChange({ srid: event.target.value })}
          placeholder="32718"
          aria-label={t('objects.crs')}
        />
        <p className="text-xs text-ink-muted">EPSG:{settings.srid || '4326'}</p>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import type { PageComponent, PageComponentSettingsProps } from '@wasichai/core'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { geometryFields } from '../lib/geo'
import { componentGeometry } from '../types'

// a select item cannot carry null, so "every geometry" needs a value of its own
export const ALL_GEOMETRIES = '__all__'

export function geometryPatch(value: string): Partial<PageComponent> {
  return { geometry: value === ALL_GEOMETRIES ? null : value }
}

export function MapSettings({ component, definition, onChange }: PageComponentSettingsProps) {
  const { t } = useTranslation(['gis', 'common'])
  return (
    <div className="space-y-1.5">
      <Label>{t('pages.geometry')}</Label>
      <Select value={componentGeometry(component) ?? ALL_GEOMETRIES} onValueChange={(value) => onChange(geometryPatch(value))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_GEOMETRIES}>{t('pages.allGeometries')}</SelectItem>
          {geometryFields(definition).map((field) => (
            <SelectItem key={field.name} value={field.name}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import { featureStyleOf, legendItems, type AttributeStyle, type StyleClasses } from './lib/style'
import type { FeatureCollection } from './types'

// a geojson Feature holds one geometry, so a request carries one. the name is part of the key,
// or switching geometry would show the previous one's cache. ['features', object] is also what
// recordQueryKeys hands core, so a record write makes every geometry of the object stale.
export function useFeatures(objectName: string | undefined, geometry?: string) {
  const search = geometry ? `?geometry=${encodeURIComponent(geometry)}` : ''
  return useQuery({
    queryKey: ['features', objectName, geometry ?? ''],
    queryFn: () => api<FeatureCollection>(`/gis/objects/${objectName}/features${search}`),
    enabled: Boolean(objectName)
  })
}

// the classes come from all of the tenant's rows, not the features on screen. under ['features', object] so a
// record write recomputes them too.
export function useStyleClasses(objectName: string | undefined, style: AttributeStyle | null | undefined) {
  return useQuery({
    queryKey: ['features', objectName, 'style-classes', style ?? null],
    queryFn: () => api<StyleClasses>(`/gis/objects/${objectName}/style-classes`, { method: 'POST', body: JSON.stringify(style) }),
    enabled: Boolean(objectName && style),
    retry: false
  })
}

// what a styled map needs: the paint for MapView and the legend's items
export function useAttributeStyle(objectName: string | undefined, style: AttributeStyle | null | undefined) {
  const classes = useStyleClasses(objectName, style)
  const resolved = style ? classes.data : undefined
  return {
    classes: resolved,
    featureStyle: featureStyleOf(resolved),
    legend: legendItems(resolved),
    isLoading: classes.isLoading,
    error: style ? classes.error : null
  }
}

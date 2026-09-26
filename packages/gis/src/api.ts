import { useQuery } from '@tanstack/react-query'
import { api } from '@wasichai/core'
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { MapViewPayload, MapViewRecord } from './types'

const MAP_VIEWS_KEY = ['gis', 'map-views']

export function useMapViews() {
  return useQuery({
    queryKey: MAP_VIEWS_KEY,
    queryFn: () => api<MapViewRecord[]>('/gis/map-views')
  })
}

export function useMapView(objectName: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey: [...MAP_VIEWS_KEY, objectName, name],
    queryFn: () => api<MapViewRecord>(`/gis/objects/${objectName}/map-views/${encodeURIComponent(name ?? '')}`),
    enabled: Boolean(objectName && name),
    retry: false
  })
}

// a name taken on the object is updated, a new one created: the dialog offers both through one save
export function useSaveMapView(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ view, exists }: { view: MapViewPayload; exists: boolean }) =>
      exists
        ? api<MapViewRecord>(`/gis/objects/${objectName}/map-views/${encodeURIComponent(view.name)}`, {
            method: 'PUT',
            body: JSON.stringify({ label: view.label, geometryName: view.geometryName, style: view.style })
          })
        : api<MapViewRecord>(`/gis/objects/${objectName}/map-views`, { method: 'POST', body: JSON.stringify(view) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MAP_VIEWS_KEY })
  })
}

export function useDeleteMapView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectName, name }: { objectName: string; name: string }) =>
      api<void>(`/gis/objects/${objectName}/map-views/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MAP_VIEWS_KEY })
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { GeoServerServices, LayerStatus } from './types'

const LAYERS_KEY = ['gis', 'layers']

// a layer is one geometry of one object, so it takes both halves to name one
export interface LayerKey {
  objectName: string
  geometryName: string
}

// geoserver may be off or the endpoint may not exist yet. do not retry, just report it.
export function useLayers() {
  return useQuery({
    queryKey: LAYERS_KEY,
    queryFn: () => api<LayerStatus[]>('/gis/layers'),
    retry: false
  })
}

export function useGeoServerServices() {
  return useQuery({
    queryKey: ['gis', 'services'],
    queryFn: () => api<GeoServerServices>('/gis/services'),
    retry: false
  })
}

export function usePublishLayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectName, geometryName }: LayerKey) => api<LayerStatus>(`/gis/layers/${objectName}/${geometryName}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LAYERS_KEY })
  })
}

export function useUnpublishLayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectName, geometryName }: LayerKey) => api<void>(`/gis/layers/${objectName}/${geometryName}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LAYERS_KEY })
  })
}

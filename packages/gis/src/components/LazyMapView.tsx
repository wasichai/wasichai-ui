import { lazy, Suspense } from 'react'
import { cn } from '@wasichai/ui'
import type { MapViewProps } from './MapView'

export type { MapViewProps, WmsLayerSpec } from './MapView'

// maplibre and terra-draw load with the first map drawn, not with the module: they stay out of the
// app's first bundle, and registering gis never evaluates them
const Loaded = lazy(() => import('./MapView').then((module) => ({ default: module.MapView })))

export function MapView(props: MapViewProps) {
  return (
    <Suspense fallback={<div className={cn('h-full w-full bg-surface-muted', props.className)} />}>
      <Loaded {...props} />
    </Suspense>
  )
}

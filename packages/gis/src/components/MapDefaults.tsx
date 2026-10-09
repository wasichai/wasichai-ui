import { createContext, use, type ComponentType, type ReactNode } from 'react'
import type { BasemapSpec, MapInitialView } from '../lib/basemap'

// gisModule's map defaults. one context, so the module's own pages and app code inside WasichaiApp
// draw the same base map. no maplibre import here: this file loads eagerly with the module.

export interface MapDefaults {
  basemap?: BasemapSpec
  initialView?: MapInitialView
}

const MapDefaultsContext = createContext<MapDefaults>({})

export function useMapDefaults(): MapDefaults {
  return use(MapDefaultsContext)
}

// closes over one object: the context value never changes, nothing below re-renders for it
export function mapDefaultsProvider(defaults: MapDefaults): ComponentType<{ children: ReactNode }> {
  return function MapDefaultsProvider({ children }: { children: ReactNode }) {
    return <MapDefaultsContext value={defaults}>{children}</MapDefaultsContext>
  }
}

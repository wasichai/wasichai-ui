# @wasichai/gis

Module guide: [docs/modules/gis.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/gis.md).

Maps for wasichai: a map page, GeoServer layer publishing, a GEOMETRY field type drawn on a map, and a
MAP component for record pages. MapLibre and terra-draw load only when a map is on screen.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```bash
yarn add @wasichai/core @wasichai/ui @wasichai/gis
yarn add maplibre-gl@6.10.0
```

`terra-draw` and `terra-draw-maplibre-gl-adapter` are regular dependencies of `@wasichai/gis`, not
peers: do not add them yourself. `maplibre-gl` is also a regular dependency of `@wasichai/gis`, but
add it to your app too, pinned to the exact same `6.10.0` @wasichai/gis ships: your app imports its
CSS and worker script directly (below), and yarn/pnpm/PnP hoisting a single shared copy is not
guaranteed, so an unpinned or mismatched version can leave the app running a different maplibre-gl
than the one @wasichai/gis's `MapView` uses.

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { gisModule } from '@wasichai/gis'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'Catastro' }} modules={[gisModule({ workerUrl })]} />
}
```

## MapLibre worker

MapLibre 6 finds its web worker through `import.meta.url`, which bundling breaks. Without an explicit
url, GeoJSON sources silently never load, and wasichai warns once in the console. The package itself
imports no bundler-specific syntax: the app passes the url.

`maplibre-gl-worker.mjs` itself imports `maplibre-gl-shared.mjs` (a sibling file, not inlined). A
recipe that only copies the worker file and hands out its raw url ships a worker that 404s on that
import in production. Bundle the worker (so its own imports come along), or copy both files together.

- **Vite:** `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'` (as above).
  The `?worker` suffix tells Vite to build the file as its own entry, so the `maplibre-gl-shared.mjs`
  import gets bundled into the one file `&url` then hands you the url of. Plain `?url` only copies the
  worker file byte-for-byte: `maplibre-gl-shared.mjs` never ships, and the worker fails to import it
  at runtime. Verified against this repo's `maplibre-gl@6.10.0` and `vite@8.3.0`: `?worker&url` emits
  one 508 kB self-contained file with no `maplibre-gl-shared` import left in it; plain `?url` emits a
  19 kB file that still `import`s `./maplibre-gl-shared.mjs`, which the build never writes to `dist/`.
  TypeScript needs to know what a `?worker&url` import resolves to: add `"types": ["vite/client"]`
  to your app's `tsconfig.json` `compilerOptions`, or the import errors as an unresolved module.
- **webpack 5 / rspack:** these bundlers do not offer an equivalent single-file worker build, so copy
  both `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` into the
  same output folder (e.g. with `copy-webpack-plugin`) and point `workerUrl` at the worker:
  `const workerUrl = new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href`.
- **Anything else:** copy both `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` and
  `maplibre-gl-shared.mjs` into the same folder of your public assets, and pass the worker's public
  path, e.g. `gisModule({ workerUrl: '/maplibre-gl-worker.mjs' })`.

Also import `maplibre-gl/dist/maplibre-gl.css` once, or map controls render unstyled.

Calling `gisModule({ workerUrl })` more than once (with different urls) is unusual, but if an app
does it, the last call wins for every `MapView` mounted anywhere on the page: the url lives in
module-level state, not per module instance.

## Base map

Every map (the map page, the geometry editor, the `MAP` page component, the layers preview, and any `MapView`
your app mounts inside `WasichaiApp`) draws the same base map. The default is the public OpenStreetMap raster
(`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, "© OpenStreetMap contributors"), whose usage policy forbids heavy
use: a production app should point at its own tile service.

```tsx
gisModule({
  workerUrl,
  basemap: { type: 'raster', tiles: ['https://tiles.example.org/{z}/{x}/{y}.png'], attribution: '© Example', maxzoom: 19 },
  initialView: { center: [-71.54, -16.41], zoom: 13 }
})
```

`BasemapSpec` (exported) is one of:

| Spec | Draws |
|---|---|
| `{ type: 'raster', tiles, tileSize?, attribution?, maxzoom? }` | a raster tile template (`tileSize` default 256) |
| `{ type: 'style', url }` | a MapLibre style JSON, vector tiles included |
| `{ type: 'none' }` | no base map: a plain background under the overlays |

A `MapView` takes the same `basemap` and `initialView` props, which win over the module's. Changing `basemap` at
runtime keeps the map, its features, its WMS layers and the shape being drawn; `initialView` is read once.

### Content-Security-Policy

MapLibre fetches tiles, styles, glyphs and sprites with `fetch` and decodes images through `blob:` urls:

- `connect-src`: the tile host, or the style host and every host its style names (tiles, glyphs, sprite); also the
  GeoServer host the layers preview reads WMS from.
- `img-src`: the same hosts, plus `blob:` and `data:`.
- `worker-src`: `'self'` when `workerUrl` is served from the app's origin; add `blob:` when it is not (MapLibre then
  wraps the worker in a `blob:` url).

The OpenStreetMap default needs `https://tile.openstreetmap.org` in `connect-src` and `img-src`.

## What it adds

| Slot | Contribution |
|---|---|
| routes | `gis:map` → `/gis/map` (`?object=&geometry=`), `gis:layers` → `/gis/layers` |
| nav | group "GIS" (order 20): Maps, Layers, Map views (placeholder) |
| fieldRenderers | `GEOMETRY`: values in `record.geometries`; settings `geometryType` (default `POLYGON`) and `srid` (default `4326`) |
| pageComponents | `MAP`: draws the record's shapes, optionally one targeted geometry field |
| recordListActions | "Map" button on spatial objects' record lists |
| dashboardCards / objectTileDetails / objectColumns | spatial object count, `TYPE · EPSG:n` lines, objects-table column |
| auditValueFormatters / auditFieldLabels | shape changes read "geometry updated", never coordinates |
| recordQueryKeys | `['features', object]` goes stale on every record write |
| providers | the `basemap` and `initialView` options, read by every `MapView` in the app |

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'gis'` | url prefix of the map and layers pages |
| `workerUrl` | none | MapLibre worker script url (see above). Module-level: the last `gisModule({ workerUrl })` call wins for every `MapView` on the page. |
| `basemap` | OpenStreetMap raster | base map of every `MapView` in the app (see "Base map"). A `MapView`'s own `basemap` prop wins. |
| `initialView` | `{ center: [-77.04, -12.05], zoom: 11 }` | camera of every map before its features load. A `MapView`'s own `initialView` prop wins. |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

Needs the wasichai GIS backend module: `/gis/objects/{object}/features`, `/gis/layers`, `/gis/services`.
Layer publishing also needs GeoServer; without it the layers page lists the spatial objects and
disables publishing. Endpoints of an absent backend module must answer 404.

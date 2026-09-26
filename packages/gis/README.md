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

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'gis'` | url prefix of the map and layers pages |
| `workerUrl` | none | MapLibre worker script url (see above). Module-level: the last `gisModule({ workerUrl })` call wins for every `MapView` on the page. |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

Needs the wasichai GIS backend module: `/gis/objects/{object}/features`, `/gis/layers`, `/gis/services`.
Layer publishing also needs GeoServer; without it the layers page lists the spatial objects and
disables publishing. Endpoints of an absent backend module must answer 404.

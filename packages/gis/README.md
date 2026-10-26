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
A style URL loads over the plain background once the map is up. If it fails (CSP, host down), the map keeps its
previous base map, the overlays keep working, and MapLibre reports a map `error`; switching to another spec and back
retries it.

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
| routes | `gis:map` → `/gis/map` (`?object=&geometry=&by=&type=&classes=&view=`), `gis:layers` → `/gis/layers`, `gis:mapViews` → `/gis/map-views` |
| nav | group "GIS" (order 20): Maps, Layers, Map views |
| fieldRenderers | `GEOMETRY`: values in `record.geometries`; settings `geometryType` (default `POLYGON`) and `srid` (default `4326`) |
| pageComponents | `MAP`: draws the record's shapes, optionally one targeted geometry field |
| recordListActions | "Map" button on spatial objects' record lists |
| dashboardCards / objectTileDetails / objectColumns | spatial object count, `TYPE · EPSG:n` lines, objects-table column |
| auditValueFormatters / auditFieldLabels | shape changes read "geometry updated", never coordinates |
| recordQueryKeys | `['features', object]` goes stale on every record write |
| providers | the `basemap`, `initialView` and `wmsAuth` options, read by every `MapView` in the app |

## Colouring by an attribute

The map page colours an object by one of its fields, shows a legend, saves the map as a map view and publishes the
GeoServer layer with the same colours. A style is `{ by, type: 'categories' | 'quantiles', classes?, palette? }`:
categories for an `ENUM`, `BOOLEAN` or `TEXT` field, quantiles (2–9 classes, default 5) for an `INTEGER` or
`DECIMAL`. The server computes the classes from all of the tenant's rows, so the map, its legend and the WMS layer
agree.

To colour a `MapView` of your own:

```tsx
import { MapLegend, MapView, useAttributeStyle, useFeatures } from '@wasichai/gis'

function Aranceles() {
  const features = useFeatures('tramo')
  const styled = useAttributeStyle('tramo', { by: 'arancel', type: 'quantiles', classes: 5 })
  return (
    <>
      <MapView featureCollection={features.data} featureStyle={styled.featureStyle} />
      <MapLegend items={styled.legend} />
    </>
  )
}
```

`featureStyle` also takes a colour or a MapLibre expression of your own (`{ color: ['match', …] }`), and
`lineOffset` to draw lines beside their axis.

A link to `/gis/map?object=…&view=<name>` opens the saved view with its geometry and its whole style, palette
included. `geometry`, `by` and `type` in the url win over the view's; the view's palette stays while the url colours
by the same field the same way, since the url cannot carry it.

## Protected WMS

A GeoServer behind the app's own authentication (nginx `auth_request`, say) answers 401 to tiles without a token.
`gisModule({ wmsAuth: true })` makes every `MapView` (the layers preview included) send the session's
`Authorization: Bearer` header with each tile it asks of the app's own origin; another host never sees the token.
The WMS urls must then reach GeoServer through that origin: the browser uses the urls `/gis/layers` answers with as
they are, so set `wasichai.gis.geoserver.public-url` on the backend (a relative `/geoserver`, say) when GeoServer's
own url is an internal host.

For anything else, a `MapView` takes MapLibre's `transformRequest` (headers or a rewritten url per request), which
wins over `wmsAuth`:

```tsx
<MapView wmsLayers={layers} transformRequest={(url) => ({ url, headers: { 'X-Api-Key': key } })} />
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'gis'` | url prefix of the map and layers pages |
| `workerUrl` | none | MapLibre worker script url (see above). Module-level: the last `gisModule({ workerUrl })` call wins for every `MapView` on the page. |
| `basemap` | OpenStreetMap raster | base map of every `MapView` in the app (see "Base map"). A `MapView`'s own `basemap` prop wins. |
| `initialView` | `{ center: [-77.04, -12.05], zoom: 11 }` | camera of every map before its features load. A `MapView`'s own `initialView` prop wins. |
| `wmsAuth` | `false` | send the session's token with every tile of the app's origin (see "Protected WMS"). A `MapView`'s own `transformRequest` prop wins. |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

Needs the wasichai GIS backend module: `/gis/objects/{object}/features`, `/gis/objects/{object}/style-classes`,
`/gis/layers` (a publish may carry `{ style }`), `/gis/services`, `/gis/map-views` and
`/gis/objects/{object}/map-views`.
Layer publishing also needs GeoServer; without it the layers page lists the spatial objects and
disables publishing. Endpoints of an absent backend module must answer 404.

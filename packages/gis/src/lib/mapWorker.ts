// maplibre 6 resolves its worker from import.meta.url, which bundling breaks: without an explicit
// url geojson sources silently never load. the app knows its bundler, so it hands the url to
// gisModule; MapView applies it right before the first map. no maplibre import here, so the
// module can be registered without loading maplibre.
let pending: string | undefined
let settled = false

export function setMapWorkerUrl(url: string | undefined): void {
  if (url) pending = url
}

export function applyMapWorkerUrl(apply: (url: string) => void): void {
  if (pending) {
    apply(pending)
    pending = undefined
    settled = true
    return
  }
  if (settled) return
  settled = true
  console.warn('@wasichai/gis: gisModule() got no workerUrl, so maplibre may never load map data. See the @wasichai/gis README, "MapLibre worker".')
}

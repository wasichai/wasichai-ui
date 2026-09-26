// maplibre raster sources want a tile template, geoserver hands us a plain GetMap url.
// lives here (not in MapView) so it can be tested without loading maplibre in jsdom.

const BBOX_TEMPLATE = '{bbox-epsg-3857}'

// params we own. anything the caller already set for them is stale, so it gets replaced.
const MANAGED = ['bbox', 'width', 'height', 'srs', 'format', 'transparent']

export const WMS_TILE_SIZE = 256

export function wmsTileUrl(url: string, tileSize: number = WMS_TILE_SIZE): string {
  const split = url.indexOf('?')
  const base = split === -1 ? url : url.slice(0, split)
  const query = split === -1 ? '' : url.slice(split + 1)

  // keep the caller's params in order, drop ours whatever case they were written in
  const params = new URLSearchParams([...new URLSearchParams(query)].filter(([key]) => !MANAGED.includes(key.toLowerCase())))
  params.set('bbox', BBOX_TEMPLATE)
  params.set('width', String(tileSize))
  params.set('height', String(tileSize))
  params.set('srs', 'EPSG:3857')
  params.set('format', 'image/png')
  params.set('transparent', 'true')

  return `${base}?${readable(params.toString())}`
}

// URLSearchParams escapes the braces, and maplibre only matches the literal placeholder.
// colons come back too, just so the url stays readable when someone copies it.
function readable(query: string): string {
  return query.replace(/%7B/gi, '{').replace(/%7D/gi, '}').replace(/%3A/gi, ':')
}

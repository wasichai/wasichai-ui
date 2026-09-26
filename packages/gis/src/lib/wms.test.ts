import { describe, expect, it } from 'vitest'
import { wmsTileUrl } from './wms'

const BASE = 'http://localhost:8600/geoserver/wasichai/wms'

function params(url: string): URLSearchParams {
  return new URLSearchParams(url.slice(url.indexOf('?') + 1))
}

describe('wmsTileUrl', () => {
  it('keeps the parameters the caller already set', () => {
    const tiles = wmsTileUrl(`${BASE}?service=WMS&version=1.1.1&request=GetMap&layers=wasichai:predio`)
    const query = params(tiles)
    expect(query.get('service')).toBe('WMS')
    expect(query.get('version')).toBe('1.1.1')
    expect(query.get('request')).toBe('GetMap')
    expect(query.get('layers')).toBe('wasichai:predio')
  })

  it('sets the tile parameters maplibre needs', () => {
    const tiles = wmsTileUrl(`${BASE}?layers=wasichai:predio`)
    const query = params(tiles)
    expect(query.get('bbox')).toBe('{bbox-epsg-3857}')
    expect(query.get('width')).toBe('256')
    expect(query.get('height')).toBe('256')
    expect(query.get('srs')).toBe('EPSG:3857')
    expect(query.get('format')).toBe('image/png')
    expect(query.get('transparent')).toBe('true')
  })

  it('leaves the bbox placeholder unescaped so maplibre can substitute it', () => {
    expect(wmsTileUrl(`${BASE}?layers=wasichai:predio`)).toContain('bbox={bbox-epsg-3857}')
  })

  it('replaces an existing bbox instead of duplicating it', () => {
    const tiles = wmsTileUrl(`${BASE}?layers=wasichai:predio&bbox=-180,-90,180,90`)
    expect(params(tiles).getAll('bbox')).toEqual(['{bbox-epsg-3857}'])
    expect(tiles).not.toContain('-180,-90')
  })

  it('replaces parameters written in another case', () => {
    const tiles = wmsTileUrl(`${BASE}?LAYERS=wasichai:predio&BBOX=1,2,3,4&WIDTH=512&FORMAT=image/jpeg`)
    const query = params(tiles)
    expect(query.getAll('bbox')).toEqual(['{bbox-epsg-3857}'])
    expect(query.getAll('width')).toEqual(['256'])
    expect(query.getAll('format')).toEqual(['image/png'])
    expect(query.get('LAYERS')).toBe('wasichai:predio')
    expect(tiles).not.toContain('image/jpeg')
  })

  it('handles a url with no query string at all', () => {
    const tiles = wmsTileUrl(BASE)
    expect(tiles.startsWith(`${BASE}?`)).toBe(true)
    expect(params(tiles).get('format')).toBe('image/png')
  })

  it('keeps a relative url relative', () => {
    const tiles = wmsTileUrl('/geoserver/wasichai/wms?layers=wasichai:predio')
    expect(tiles.startsWith('/geoserver/wasichai/wms?')).toBe(true)
  })

  it('honours a tile size other than 256', () => {
    const query = params(wmsTileUrl(`${BASE}?layers=wasichai:predio`, 512))
    expect(query.get('width')).toBe('512')
    expect(query.get('height')).toBe('512')
  })
})

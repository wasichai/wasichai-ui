import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// core must stay installable without gis, workflow, documents or the builders: no import of their
// heavy libraries or packages, no gis vocabulary, no hardcoded urls or storage keys.
// note: `fileURLToPath(new URL('.', import.meta.url))` looks equivalent but Vite's import-analysis
// plugin statically rewrites `new URL(_, import.meta.url)` into a dev-server asset url, which breaks
// under jsdom; `import.meta.dirname` is not rewritten and resolves correctly.
const SRC = import.meta.dirname

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

function offenders(pattern: RegExp, except: (file: string) => boolean = () => false): string[] {
  return sources(SRC)
    .filter((file) => !except(file) && pattern.test(readFileSync(file, 'utf8')))
    .map((file) => relative(SRC, file))
}

describe('core boundaries', () => {
  it('scans the whole source tree', () => {
    expect(sources(SRC).length).toBeGreaterThan(50)
  })

  it('never imports a heavy library or another module package', () => {
    expect(offenders(/from '(maplibre-gl|terra-draw[^']*|@xyflow\/[^']*|@tiptap\/[^']*|@dnd-kit\/[^']*|@wasichai\/(?!ui')[^']*)'/)).toEqual([])
  })

  it('never names gis concepts outside tests', () => {
    expect(offenders(/geometr|srid|epsg|maplibre|geojson/i)).toEqual([])
  })

  it('never spells an in-app url: links build them', () => {
    expect(offenders(/['"`]\/(data|admin|gis|builder|automation|documents)\//)).toEqual([])
  })

  it('never names a storage key: storageKeys builds them', () => {
    expect(offenders(/localStorage\.(getItem|setItem|removeItem)\(['"`]/)).toEqual([])
  })
})

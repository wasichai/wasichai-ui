import { afterEach, describe, expect, it, vi } from 'vitest'

// module state: a fresh copy per test
async function fresh() {
  vi.resetModules()
  return import('./mapWorker')
}

afterEach(() => vi.restoreAllMocks())

describe('map worker url', () => {
  it('hands the configured url to maplibre once, before the first map', async () => {
    const { setMapWorkerUrl, applyMapWorkerUrl } = await fresh()
    const apply = vi.fn()
    setMapWorkerUrl('/assets/maplibre-gl-worker.mjs')
    applyMapWorkerUrl(apply)
    applyMapWorkerUrl(apply)
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith('/assets/maplibre-gl-worker.mjs')
  })

  it('warns once when the app never gave one, instead of failing silently', async () => {
    const { applyMapWorkerUrl } = await fresh()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const apply = vi.fn()
    applyMapWorkerUrl(apply)
    applyMapWorkerUrl(apply)
    expect(apply).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('workerUrl')
  })

  it('ignores an empty url', async () => {
    const { setMapWorkerUrl, applyMapWorkerUrl } = await fresh()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const apply = vi.fn()
    setMapWorkerUrl(undefined)
    setMapWorkerUrl('')
    applyMapWorkerUrl(apply)
    expect(apply).not.toHaveBeenCalled()
  })
})

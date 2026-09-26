import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agentModule } from '@wasichai/agent'
import { automationModule } from '@wasichai/automation'
import { WasichaiApp, type WasichaiModule } from '@wasichai/core'
import { documentsModule } from '@wasichai/documents'
import { formsModule } from '@wasichai/forms'
import { gisModule } from '@wasichai/gis'
import { pagesModule } from '@wasichai/pages'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { viewsModule } from '@wasichai/views'
import { workflowModule } from '@wasichai/workflow'

// the smoke never draws a map; jsdom has no webgl, so the map libraries are stand-ins
vi.mock('maplibre-gl', () => ({ setWorkerUrl: () => {} }))
vi.mock('terra-draw', () => ({}))
vi.mock('terra-draw-maplibre-gl-adapter', () => ({}))

const ana = { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'o1', roles: ['ADMIN'] }
const allModules = (): WasichaiModule[] => [
  gisModule(),
  workflowModule(),
  automationModule(),
  documentsModule(),
  pagesModule(),
  viewsModule(),
  formsModule(),
  agentModule()
]

let fetch: FetchMock | null = null
beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})
afterEach(() => fetch?.restore())

function signIn() {
  localStorage.setItem('smoke.token', 't')
  localStorage.setItem('smoke.user', JSON.stringify(ana))
  fetch = mockFetch([
    { path: '/auth/me/permissions', body: { admin: true, objects: {} } },
    { path: '/objects', body: [] }
  ])
}

describe('WasichaiApp with every module', () => {
  it('registers all eight modules next to core and lists each one in the sidebar', async () => {
    signIn()
    render(<WasichaiApp config={{ storagePrefix: 'smoke' }} modules={allModules()} />)

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    for (const group of ['GIS', 'App Builder', 'Automatización']) expect(screen.getByText(group)).toBeInTheDocument()
    for (const name of ['Mapas', 'Capas', 'Páginas', 'Formularios', 'Documentos', 'Vistas', 'Workflows', 'Reglas', 'Ejecuciones', 'Asistente']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('draws the module strings in english too, from the modules own bundles', async () => {
    signIn()
    localStorage.setItem('smoke.lang', 'en')
    render(<WasichaiApp config={{ storagePrefix: 'smoke' }} modules={allModules()} />)

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    for (const name of ['Maps', 'Layers', 'Pages', 'Forms', 'Documents', 'Views', 'Workflows', 'Rules', 'Runs', 'Assistant']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('opens a lazy module page from the sidebar at its original url', async () => {
    signIn()
    render(<WasichaiApp config={{ storagePrefix: 'smoke' }} modules={allModules()} />)

    await userEvent.click(await screen.findByRole('link', { name: 'Vistas' }))
    expect(await screen.findByRole('heading', { name: 'Vistas' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/builder/views')
  })

  it('sends a signed-out visit to the bare print page to login', async () => {
    fetch = mockFetch([])
    window.history.pushState({}, '', '/documents/document-1/print')
    render(<WasichaiApp config={{ storagePrefix: 'smoke' }} modules={allModules()} />)

    expect(await screen.findByLabelText('Correo')).toBeInTheDocument()
  })
})

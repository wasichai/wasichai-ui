import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import type { WasichaiModule } from '../../registry/contract'
import type { ObjectDefinition, Page } from '../../types/metadata'
import { RecordDetailPage } from './RecordDetailPage'

const predio: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  fields: [
    {
      id: 'f1',
      name: 'codigo',
      label: 'Código',
      type: 'TEXT',
      required: false,
      unique: false,
      defaultValue: null,
      description: null,
      position: 0,
      enumOptions: null,
      relationTarget: null,
      visible: true,
      editable: true
    }
  ]
}

const configured: Page = {
  id: 'p1',
  name: 'predio_record_detail',
  label: 'Detalle',
  objectName: 'predio',
  kind: 'RECORD_DETAIL',
  template: { name: 'single-region', columns: 12, rows: [{ regions: [{ name: 'MAIN', span: 12 }] }] },
  generated: false,
  definition: {
    page: {
      type: 'PAGE',
      column: 1,
      title: null,
      layout: 'single-column',
      relationship: null,
      fields: null,
      content: null,
      children: [
        {
          type: 'REGION',
          region: 'MAIN',
          column: 1,
          title: null,
          layout: 'single-column',
          relationship: null,
          fields: null,
          content: null,
          children: [{ type: 'TEXT', column: 1, title: null, layout: 'single-column', relationship: null, fields: null, content: 'configurada', children: [] }]
        }
      ]
    }
  }
}

const base: MockRoute[] = [
  { path: '/metadata/objects/predio', body: predio },
  { path: '/objects/predio/records/r1', body: { id: 'r1', createdAt: null, updatedAt: null, attributes: { codigo: 'P-1' } } },
  { path: '/objects/predio/relationships', body: [] },
  { path: '/objects/predio/records/r1/history', body: [] },
  { method: 'PUT', path: '/objects/predio/records/r1', body: { id: 'r1', createdAt: null, updatedAt: null, attributes: { codigo: 'P-1' } } }
]

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

function mount(routes: MockRoute[], modules: WasichaiModule[] = []) {
  fetch = mockFetch([...routes, ...base])
  return renderWithProviders(<RecordDetailPage />, { route: '/data/objects/predio/records/r1', path: 'data/objects/:object/records/:id', modules })
}

describe('RecordDetailPage', () => {
  it('draws the page the server resolved', async () => {
    mount([{ path: '/objects/predio/pages/record-detail', body: configured }])
    expect(await screen.findByText('configurada')).toBeInTheDocument()
  })

  it('draws a page built from metadata when the server has no pages module (404)', async () => {
    mount([])
    expect(await screen.findByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.getByText('Historial')).toBeInTheDocument()
  })

  it('shows the error and no form when the page request fails with a server error', async () => {
    mount([{ path: '/objects/predio/pages/record-detail', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } }])
    expect(await screen.findByText('boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  // a link to a record deleted meanwhile (history, audit, an old tab): this read "Cargando…" for ever
  it('says the record is gone instead of loading for ever', async () => {
    mount([{ path: '/objects/predio/records/r1', status: 404, body: { title: 'Not Found', detail: 'Record not found' } }])
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el registro')
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })

  it('saves what the form holds and draws module panels under the page', async () => {
    const panels: WasichaiModule = { id: 'panels', recordPanels: [({ record }) => <p>{`panel ${record.id}`}</p>] }
    mount([], [panels])

    expect(await screen.findByText('panel r1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'PUT')).toBe(true))
    expect(fetch?.calls.find((call) => call.method === 'PUT')?.body).toEqual({ attributes: { codigo: 'P-1' } })
  })
})

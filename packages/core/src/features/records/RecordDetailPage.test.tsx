import { act, screen, waitFor, within } from '@testing-library/react'
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

  // a save or a transition invalidates the record: one failed refetch must not take the page away
  it('keeps the record on screen when a refetch of it fails', async () => {
    const { queryClient } = mount([])
    expect(await screen.findByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    fetch?.restore()
    fetch = mockFetch([{ path: '/objects/predio/records/r1', status: 502, body: { title: 'Bad Gateway' } }, ...base])
    await act(() => queryClient.invalidateQueries({ queryKey: ['record', 'predio', 'r1'] }))
    await waitFor(() => expect(queryClient.getQueryState(['record', 'predio', 'r1'])?.status).toBe('error'))
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.queryByText('No se pudo cargar')).not.toBeInTheDocument()
  })

  it('saves what the form holds and draws module panels under the page', async () => {
    const panels: WasichaiModule = { id: 'panels', recordPanels: [({ record }) => <p>{`panel ${record.id}`}</p>] }
    mount([], [panels])

    expect(await screen.findByText('panel r1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'PUT')).toBe(true))
    expect(fetch?.calls.find((call) => call.method === 'PUT')?.body).toEqual({ attributes: { codigo: 'P-1' } })
  })

  it('sends the reason with the update and shows it was required', async () => {
    mount([{ path: '/metadata/objects/predio', body: { ...predio, requiresReason: true } }])

    expect(await screen.findByText('Motivo')).toHaveTextContent('Motivo*')
    await userEvent.type(screen.getByLabelText(/Motivo/), 'ajuste')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'PUT')).toBe(true))
    expect(fetch?.calls.find((call) => call.method === 'PUT')?.headers['x-change-reason']).toBe("UTF-8''ajuste")
  })

  it('marks the fields of a repeated unique value', async () => {
    mount([
      {
        method: 'PUT',
        path: '/objects/predio/records/r1',
        status: 409,
        body: { title: 'Conflict', detail: 'Another record already has this codigo', errors: [{ field: 'codigo', message: 'must be unique' }] }
      }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar' }))

    const row = (await screen.findByText('must be unique')).closest('div')!
    expect(within(row).getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Another record already has this codigo')
    expect(screen.getByRole('alert')).not.toHaveTextContent('must be unique')
  })

  it('says why an append-only record cannot be edited', async () => {
    mount([{ path: '/metadata/objects/predio', body: { ...predio, appendOnly: true } }])

    expect(await screen.findByText('Los registros de este objeto solo se crean: no se editan ni se eliminan.')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })
})

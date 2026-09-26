import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { coreModule, createRegistry, PageRenderer, type ObjectDefinition, type Page, type PageComponent, type RecordItem } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { workflowModule } from '../module'

const definition: ObjectDefinition = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
const record: RecordItem = { id: 'r1', createdAt: null, updatedAt: null, attributes: {} }

function node(type: string, extra: Partial<PageComponent> = {}): PageComponent {
  return { type, column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, region: null, ...extra }
}

const page: Page = {
  id: 'p1',
  name: 'predio_record_detail',
  label: 'Detalle de predio',
  objectName: 'predio',
  kind: 'RECORD_DETAIL',
  template: { name: 'single-region', columns: 12, rows: [{ regions: [{ name: 'MAIN', span: 12 }] }] },
  generated: false,
  definition: { page: node('PAGE', { children: [node('REGION', { region: 'MAIN', children: [node('WORKFLOW')] })] }) }
}

const workflow = {
  id: 'wf-1',
  objectName: 'predio',
  name: 'approval',
  label: 'Aprobación',
  enabled: true,
  definition: {
    states: [
      { name: 'review', label: 'En revisión', type: 'INTERMEDIATE' },
      { name: 'approved', label: 'Aprobado', type: 'FINAL' }
    ],
    transitions: [{ name: 'aprobar', label: 'Aprobar', from: 'review', to: 'approved', roles: [] }]
  }
}

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('WORKFLOW page component', () => {
  it('draws the record state and its way out where the admin placed it', async () => {
    fetch = mockFetch([
      { path: '/objects/predio/workflow', body: workflow },
      {
        path: '/objects/predio/records/r1/transitions',
        body: [{ name: 'aprobar', label: 'Aprobar', to: 'approved', toLabel: 'Aprobado', allowed: true, reason: null }]
      },
      { path: '/objects/predio/records/r1', body: { ...record, state: 'review' } }
    ])
    // core declares the 'automation' nav group workflowModule's nav item points at; createRegistry
    // validates that eagerly, so it must be in the array even though this test never draws the sidebar
    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />, { modules: [coreModule, workflowModule()] })

    expect(await screen.findByRole('heading', { name: 'Aprobación' })).toBeInTheDocument()
    expect(await screen.findByTestId('workflow-state')).toHaveTextContent('En revisión')
    expect(await screen.findByRole('button', { name: /Aprobar/ })).toBeEnabled()
  })

  it('previews a state pill in the page builder without fetching anything', () => {
    fetch = mockFetch([])
    const Preview = createRegistry([coreModule, workflowModule()]).pageComponents.WORKFLOW.preview!
    renderWithProviders(<Preview component={node('WORKFLOW')} definition={definition} />, { modules: [coreModule, workflowModule()] })

    expect(screen.getByText('Estado inicial')).toBeInTheDocument()
    expect(fetch.calls).toEqual([])
  })
})

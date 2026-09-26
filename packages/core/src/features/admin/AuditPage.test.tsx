import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { issueModule } from '../../test/fakeModules'
import { AuditPage } from './AuditPage'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('AuditPage', () => {
  it('names a module value and column when a change row is opened', async () => {
    fetch = mockFetch([
      { path: '/objects', body: [] },
      {
        path: '/metadata/objects/predio',
        body: { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
      },
      {
        path: /^\/audit\?/,
        body: [
          {
            id: 'a1',
            userEmail: 'ana@wasichai.test',
            objectName: 'predio',
            recordId: 'r1',
            operation: 'UPDATE',
            occurredAt: '2026-09-17T11:00:00Z',
            changes: [{ field: 'sketch', before: null, after: { strokes: [[0, 0, 1, 1]] } }]
          }
        ]
      }
    ])
    renderWithProviders(<AuditPage />, { modules: [issueModule] })

    await userEvent.click(await screen.findByRole('button', { name: 'Ver cambios' }))

    expect(await screen.findByText('Boceto')).toBeInTheDocument()
    expect(screen.getByText('boceto actualizado')).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { RelationshipsPage } from './RelationshipsPage'

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

const relationship = {
  id: 'rel-1',
  name: 'predio_titular',
  label: 'Titulares',
  inverseLabel: 'Predios',
  type: 'MANY_TO_MANY',
  source: 'predio',
  target: 'titular',
  fieldName: null,
  joinTable: 'predio_titular'
}

describe('RelationshipsPage', () => {
  // a composite index naming it, an append-only end: the delete used to fail in silence
  it('says why a delete was refused', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fetch = mockFetch([
      { path: '/relationships', body: [relationship] },
      { path: '/objects', body: [] },
      { method: 'DELETE', path: '/relationships/predio_titular', status: 409, body: { title: 'Conflict', detail: 'Un índice compuesto la nombra' } }
    ])
    renderWithProviders(<RelationshipsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Un índice compuesto la nombra')
  })
})

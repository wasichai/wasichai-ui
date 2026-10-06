import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { RelatedSide } from '../../types/metadata'
import { RelatedList } from './RelatedList'

vi.mock('@wasichai/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/ui')>()),
  ...(await import('../../test/nativeSelect'))
}))

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

const side: RelatedSide = {
  relationship: 'predio_titular',
  label: 'Titulares',
  type: 'MANY_TO_MANY',
  objectName: 'titular',
  objectLabel: 'Titular',
  many: true
}
const titular = { id: 'o2', name: 'titular', label: 'Titular', pluralLabel: 'Titulares', description: null, enabled: true, fields: [] }
const page = (ids: string[]) => ({
  content: ids.map((id) => ({ id, createdAt: null, updatedAt: null, attributes: {} })),
  page: 0,
  size: 25,
  totalElements: ids.length,
  totalPages: 1
})

// a refused link or unlink (append-only end, no permission) used to change nothing on screen
describe('RelatedList links', () => {
  it('says why a link was refused, and keeps the pick', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/titular', body: titular },
      { path: '/objects/predio/records/r1/related/predio_titular', body: page([]) },
      { path: '/objects/titular/records', body: page(['t1']) },
      {
        method: 'POST',
        path: '/objects/predio/records/r1/related/predio_titular',
        status: 409,
        body: { title: 'Conflict', detail: 'El otro lado es de solo anexado' }
      }
    ])
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), await screen.findByRole('option', { name: 't1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vincular' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El otro lado es de solo anexado')
    expect(screen.getByRole('combobox')).toHaveValue('t1')
  })

  it('says why an unlink was refused', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/titular', body: titular },
      { path: '/objects/predio/records/r1/related/predio_titular', body: page(['t1']) },
      { path: '/objects/titular/records', body: page([]) },
      {
        method: 'DELETE',
        path: '/objects/predio/records/r1/related/predio_titular/t1',
        status: 403,
        body: { title: 'Forbidden', detail: 'Sin permiso para editar titular' }
      }
    ])
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Desvincular' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin permiso para editar titular')
  })
})

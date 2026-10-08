import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { RecordFormPage } from './RecordFormPage'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('RecordFormPage', () => {
  // the object never arrives on a failure: this read "Cargando…" for ever
  it('says the object could not be loaded, and retries', async () => {
    fetch = mockFetch([{ path: '/metadata/objects/predio', status: 500, body: { title: 'Internal Server Error', detail: 'Base de datos caída' } }])
    renderWithProviders(<RecordFormPage />, { route: '/data/objects/predio/records/new', path: 'data/objects/:object/records/new' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Base de datos caída')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(fetch.calls.filter((call) => call.path === '/metadata/objects/predio')).toHaveLength(2)
  })
})

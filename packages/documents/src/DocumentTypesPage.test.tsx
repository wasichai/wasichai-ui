import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { coreModule } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { DocumentTypesPage } from './DocumentTypesPage'
import { documentsModule } from './module'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('DocumentTypesPage', () => {
  it('asks for an object before showing any type', async () => {
    fetch = mockFetch([{ path: '/objects', body: [] }])
    renderWithProviders(<DocumentTypesPage />, { modules: [coreModule, documentsModule()] })

    expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.getByText('Redacta las plantillas de documento que un registro puede emitir')).toBeInTheDocument()
    expect(await screen.findByText('Selecciona un objeto')).toBeInTheDocument()
  })
})

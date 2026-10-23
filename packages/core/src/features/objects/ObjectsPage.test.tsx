import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import type { WasichaiModule } from '../../registry/contract'
import type { ObjectSummary } from '../../types/metadata'
import { ObjectsPage } from './ObjectsPage'

const objects: ObjectSummary[] = [{ id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true }]

vi.mock('../../queries', () => ({ useObjects: () => ({ data: objects, isLoading: false }) }))

const reference: WasichaiModule = {
  id: 'crs',
  objectColumns: [{ id: 'crs', headerKey: 'crs:column', cell: ({ object }) => <span>{`ref ${object.name}`}</span> }],
  i18n: { es: { column: 'Referencia' }, en: { column: 'Reference' } }
}

describe('ObjectsPage', () => {
  it('links to create, open and edit through the app links, with no module columns', () => {
    renderWithProviders(<ObjectsPage />)
    expect(screen.getByRole('link', { name: /Nuevo objeto/ })).toHaveAttribute('href', '/data/objects/new')
    expect(screen.getByRole('link', { name: 'Ver registros' })).toHaveAttribute('href', '/data/objects/predio/records')
    expect(screen.getByRole('link', { name: 'Editar predio' })).toHaveAttribute('href', '/data/objects/predio/edit')
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
  })

  it('adds the columns modules contribute', () => {
    renderWithProviders(<ObjectsPage />, { modules: [reference] })
    expect(screen.getByRole('columnheader', { name: 'Referencia' })).toBeInTheDocument()
    expect(screen.getByText('ref predio')).toBeInTheDocument()
  })

  it('warns that the model lives in the app repository when the config says so', () => {
    renderWithProviders(<ObjectsPage />, { config: { modelInRepository: true } })
    expect(screen.getByRole('status')).toHaveTextContent('El modelo vive en el repositorio.')
  })

  it('shows no repository notice by default', () => {
    renderWithProviders(<ObjectsPage />)
    expect(screen.queryByText('El modelo vive en el repositorio.')).not.toBeInTheDocument()
  })
})

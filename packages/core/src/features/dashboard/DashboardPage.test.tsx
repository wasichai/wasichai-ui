import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import type { WasichaiModule } from '../../registry/contract'
import type { ObjectSummary } from '../../types/metadata'
import { DashboardPage } from './DashboardPage'

const objects: ObjectSummary[] = [
  { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true },
  { id: 'o2', name: 'nota', label: 'Nota', pluralLabel: 'Notas', description: null, enabled: true }
]

vi.mock('../../queries', () => ({ useObjects: () => ({ data: objects, isLoading: false }) }))

const extras: WasichaiModule = {
  id: 'extras',
  dashboardCards: [({ objects: all }) => <p>{`con plano: ${all.length}`}</p>],
  objectTileDetails: [({ object }) => <span>{`detalle ${object.name}`}</span>]
}

describe('DashboardPage', () => {
  it('counts the objects and links each tile to its records', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Predios/ })).toHaveAttribute('href', '/data/objects/predio/records')
  })

  it('draws what modules add: cards beside the count, a line on each tile', () => {
    renderWithProviders(<DashboardPage />, { modules: [extras] })
    expect(screen.getByText('con plano: 2')).toBeInTheDocument()
    expect(screen.getByText('detalle predio')).toBeInTheDocument()
    expect(screen.getByText('detalle nota')).toBeInTheDocument()
  })

  it('takes its subtitle from appTagline (#172)', () => {
    renderWithProviders(<DashboardPage />, { config: { appTagline: 'Formación continua' } })
    expect(screen.getByText('Formación continua')).toBeInTheDocument()
    expect(screen.queryByText('Plataforma de aplicaciones geoespaciales configurables')).toBeNull()
  })

  it('has no subtitle with an empty appTagline (#172)', () => {
    renderWithProviders(<DashboardPage />, { config: { appTagline: '' } })
    const header = document.querySelector('[data-slot="page-header"]')!
    expect(header.querySelector('h1')).toHaveTextContent('Inicio')
    expect(header.querySelector('p')).toBeNull()
  })

  it('keeps the welcome line without appTagline (#172)', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Plataforma de aplicaciones geoespaciales configurables')).toBeInTheDocument()
  })
})

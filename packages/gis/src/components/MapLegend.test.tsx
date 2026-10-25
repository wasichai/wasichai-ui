import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { MapLegend } from './MapLegend'

describe('MapLegend', () => {
  it('lists each class and the grey rest', () => {
    renderWithProviders(<MapLegend items={[{ label: 'vivienda', color: '#8dd3c7' }]} />, { modules: [gisModule()] })
    expect(screen.getByRole('figure', { name: 'Leyenda' })).toBeInTheDocument()
    expect(screen.getByText('vivienda')).toBeInTheDocument()
    expect(screen.getByText('Otros')).toBeInTheDocument()
  })

  it('draws nothing without classes', () => {
    const { container } = renderWithProviders(<MapLegend items={[]} />, { modules: [gisModule()] })
    expect(container).toBeEmptyDOMElement()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DynamicForm, type RecordPayload } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { point, polygon, predio, recordOf } from '../test/fixtures'

// maplibre cannot run in jsdom; the widget's own map is out of scope here
vi.mock('../components/GeometryField', () => ({
  GeometryField: ({
    name,
    geometryType,
    srid,
    value,
    onChange
  }: {
    name: string
    geometryType: string
    srid: number
    value: { type: string } | null
    onChange: (shape: unknown) => void
  }) => (
    <div data-testid="geometry-field">
      <span>{`${name} ${geometryType} ${srid} ${value?.type ?? 'vacío'}`}</span>
      <button type="button" onClick={() => onChange({ type: 'Point', coordinates: [-77.04, -12.05] })}>{`dibujar ${name}`}</button>
    </div>
  )
}))

describe('GEOMETRY in the record form', () => {
  it('draws one widget per geometry field, with its own type and srid', () => {
    renderWithProviders(<DynamicForm definition={predio} onSubmit={vi.fn()} />, { modules: [gisModule()] })
    expect(screen.getAllByTestId('geometry-field')).toHaveLength(2)
    expect(screen.getByText('lote POLYGON 32718 vacío')).toBeInTheDocument()
    expect(screen.getByText('acceso POINT 32718 vacío')).toBeInTheDocument()
  })

  it('prefills the widget from the record and submits drawn shapes under geometries, never as attributes', async () => {
    const onSubmit = vi.fn<(payload: RecordPayload) => void>()
    renderWithProviders(<DynamicForm definition={predio} record={recordOf({ lote: polygon, acceso: null })} onSubmit={onSubmit} />, {
      modules: [gisModule()]
    })
    expect(screen.getByText('lote POLYGON 32718 Polygon')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'dibujar acceso' }))
    await userEvent.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    const payload = onSubmit.mock.calls[0][0]
    expect(payload.geometries).toEqual({ lote: polygon, acceso: point })
    expect(payload.attributes).not.toHaveProperty('lote')
    expect(payload.attributes).not.toHaveProperty('acceso')
  })
})

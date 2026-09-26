import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModuleFieldSettings } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { GEOMETRY_SETTING_DEFAULTS, geometryPayload } from './geometrySettings'

const renderer = gisModule().fieldRenderers!.GEOMETRY

describe('GEOMETRY field settings', () => {
  it('starts a new field as a polygon in EPSG:4326', () => {
    expect(renderer.settings!.defaults).toEqual({ geometryType: 'POLYGON', srid: '4326' })
    expect(GEOMETRY_SETTING_DEFAULTS).toEqual({ geometryType: 'POLYGON', srid: '4326' })
  })

  it('sends the type and a numeric srid, and never a dimension', () => {
    expect(renderer.settings!.toPayload({ geometryType: 'POINT', srid: '32718' })).toEqual({ geometryType: 'POINT', srid: 32718 })
    expect(Object.keys(geometryPayload({ geometryType: 'POINT', srid: '32718', dimension: '3' }))).toEqual(['geometryType', 'srid'])
  })

  it('falls back to 4326 for a blank or garbage reference system', () => {
    expect(geometryPayload({ geometryType: 'POLYGON', srid: '' }).srid).toBe(4326)
    expect(geometryPayload({ geometryType: 'POLYGON', srid: 'utm' }).srid).toBe(4326)
    expect(geometryPayload({ geometryType: 'POLYGON', srid: '0' }).srid).toBe(4326)
  })

  it('edits the reference system through the object builder slot and shows the EPSG it will use', () => {
    const onChange = vi.fn()
    renderWithProviders(<ModuleFieldSettings renderer={renderer} settings={{ geometryType: 'POLYGON', srid: '' }} onChange={onChange} />, {
      modules: [gisModule()]
    })
    expect(screen.getByText('EPSG:4326')).toBeInTheDocument()
    expect(screen.getByLabelText('Geometría')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Sistema de referencia (CRS)'), { target: { value: '32718' } })
    expect(onChange).toHaveBeenCalledWith({ geometryType: 'POLYGON', srid: '32718' })
  })
})

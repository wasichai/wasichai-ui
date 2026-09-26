import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { coreModule, type WasichaiModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { pagesModule } from '../module'
import { pinModule, stampModule } from '../test/fakeModules'
import { actionKinds, useSeed, useTypeLabel } from './registrySlots'

function SeedProbe({ type }: { type: string }) {
  const seed = useSeed()
  return <output>{JSON.stringify(seed(type))}</output>
}

function LabelProbe({ type }: { type: string }) {
  const label = useTypeLabel()
  return <output>{label(type)}</output>
}

// coreModule owns the 'builder' nav group pagesModule() targets: the registry needs both, or it
// refuses to resolve pagesModule's own nav entry
const withModules = (ui: ReactElement, modules: WasichaiModule[] = []) => renderWithProviders(ui, { modules: [coreModule, pagesModule(), ...modules] })

describe('actionKinds', () => {
  it('lists module kinds in registration order and NAVIGATE last', () => {
    expect(actionKinds({ STAMP: stampModule.pageActions!.STAMP, SIGN: stampModule.pageActions!.STAMP })).toEqual(['STAMP', 'SIGN', 'NAVIGATE'])
    expect(actionKinds({})).toEqual(['NAVIGATE'])
  })
})

describe('useSeed', () => {
  it('makes a fresh ACTION the first module kind, with that kind defaults', () => {
    withModules(<SeedProbe type="ACTION" />, [stampModule])
    expect(JSON.parse(screen.getByRole('status').textContent ?? '')).toEqual({ style: 'PRIMARY', seal: 'oficial', action: 'STAMP' })
  })

  it('makes a fresh ACTION a NAVIGATE when no module adds a kind', () => {
    withModules(<SeedProbe type="ACTION" />)
    expect(JSON.parse(screen.getByRole('status').textContent ?? '')).toEqual({ action: 'NAVIGATE' })
  })

  it('hands a module component its own defaults and a core one nothing', () => {
    withModules(
      <>
        <SeedProbe type="PIN" />
        <SeedProbe type="FORM" />
      </>,
      [pinModule]
    )
    const [pin, form] = screen.getAllByRole('status')
    expect(JSON.parse(pin.textContent ?? '')).toEqual({ title: 'Chincheta nueva', color: 'rojo' })
    expect(JSON.parse(form.textContent ?? '')).toEqual({})
  })
})

describe('useTypeLabel', () => {
  it('names core types from the pages bundle, module types from their labelKey, and anything else by its raw type', () => {
    withModules(
      <>
        <LabelProbe type="FORM" />
        <LabelProbe type="PIN" />
        <LabelProbe type="MAP" />
      </>,
      [pinModule]
    )
    expect(screen.getAllByRole('status').map((node) => node.textContent)).toEqual(['Formulario', 'Chincheta', 'MAP'])
  })
})

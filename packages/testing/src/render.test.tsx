import { screen } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { describe, expect, it } from 'vitest'
import { coreModule, useAuth, useRegistry } from '@wasichai/core'
import { renderWithProviders } from './render'

function Who() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const registry = useRegistry()
  return <p>{`${user?.email ?? 'nobody'} ${t('common.save')} ${registry.modules.map((module) => module.id).join(',')}`}</p>
}

describe('renderWithProviders', () => {
  it('renders as a signed-in admin, in spanish, with coreModule alone', () => {
    renderWithProviders(<Who />)
    expect(screen.getByText('tester@wasichai.test Guardar core')).toBeInTheDocument()
  })

  it('takes modules, a signed-out caller and a language, with coreModule registered automatically', () => {
    renderWithProviders(<Who />, { modules: [{ id: 'gis' }], user: null, language: 'en' })
    expect(screen.getByText('nobody Save core,gis')).toBeInTheDocument()
  })

  it('does not throw when the caller passes coreModule itself', () => {
    renderWithProviders(<Who />, { modules: [coreModule, { id: 'gis' }] })
    expect(screen.getByText('tester@wasichai.test Guardar core,gis')).toBeInTheDocument()
  })

  it('mounts the ui on a route pattern so params resolve', () => {
    function Param() {
      return <p>{useParams().object}</p>
    }
    renderWithProviders(<Param />, { route: '/data/objects/predio/edit', path: 'data/objects/:object/edit' })
    expect(screen.getByText('predio')).toBeInTheDocument()
  })

  it('keeps the providers on rerender', () => {
    const { rerender } = renderWithProviders(<Who />)
    rerender(<Who />)
    expect(screen.getByText('tester@wasichai.test Guardar core')).toBeInTheDocument()
  })
})

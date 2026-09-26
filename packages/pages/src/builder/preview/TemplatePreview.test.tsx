import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { pagesModule } from '../../module'
import { TemplatePreview } from './TemplatePreview'
import { coreModule, type PageTemplate } from '@wasichai/core'

const sidebar: PageTemplate = {
  name: 'header-and-right-sidebar',
  columns: 12,
  rows: [
    { regions: [{ name: 'HEADER', span: 12 }] },
    {
      regions: [
        { name: 'MAIN', span: 8 },
        { name: 'RIGHT', span: 4 }
      ]
    }
  ]
}

describe('TemplatePreview', () => {
  it('draws one box per region, in reading order', () => {
    const { container } = renderWithProviders(<TemplatePreview template={sidebar} labels />, { modules: [coreModule, pagesModule()] })
    expect([...container.querySelectorAll('[data-region]')].map((e) => e.getAttribute('data-region'))).toEqual(['HEADER', 'MAIN', 'RIGHT'])
  })

  // inline, never a class: tailwind emits no css for a runtime width, so a class assertion lies
  it('gives each box the share its span asks for', () => {
    const { container } = renderWithProviders(<TemplatePreview template={sidebar} />, { modules: [coreModule, pagesModule()] })
    const shares = [...container.querySelectorAll('[data-region]')].map((e) => (e as HTMLElement).style.flexGrow)
    expect(shares).toEqual(['12', '8', '4'])
  })

  it('falls back to the key when it has no word for a region', () => {
    renderWithProviders(<TemplatePreview template={{ name: 'x', columns: 12, rows: [{ regions: [{ name: 'NUEVA', span: 12 }] }] }} labels />, {
      modules: [coreModule, pagesModule()]
    })
    expect(screen.getByText('NUEVA')).toBeInTheDocument()
  })

  // it goes inside a button, so it must contain nothing focusable
  it('renders no interactive element at all', () => {
    const { container } = renderWithProviders(<TemplatePreview template={sidebar} labels />, { modules: [coreModule, pagesModule()] })
    expect(container.querySelectorAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0)
  })
})

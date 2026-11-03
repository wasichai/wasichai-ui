import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { PageHeader } from './PageHeader'

const root = () => document.querySelector('[data-slot="page-header"]')!

describe('PageHeader', () => {
  it('draws the title, the subtitle and the actions, as before', () => {
    renderWithProviders(<PageHeader title="Usuarios" subtitle="De la organización" actions={<button type="button">Nuevo</button>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByText('De la organización')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument()
  })

  // jsdom applies no css: the padding is read from the classes (#124)
  it('pads 16px below md and 32px from md, and hooks a theme sheet', () => {
    renderWithProviders(<PageHeader title="Usuarios" />)
    expect(root()).toHaveClass('px-4', 'md:px-8', 'border-b', 'bg-surface')
    expect(root()).not.toHaveClass('px-8')
  })

  it('lets the actions wrap under a long title on a narrow screen', () => {
    renderWithProviders(<PageHeader title={'Un título muy largo '.repeat(6)} actions={<button type="button">Nuevo</button>} />)
    const row = screen.getByRole('heading', { level: 1 }).parentElement!.parentElement!
    expect(row).toHaveClass('flex', 'flex-wrap')
    expect(screen.getByRole('button', { name: 'Nuevo' }).parentElement).toHaveClass('flex-wrap')
  })

  it('puts the breadcrumbs before the h1 and the children after the title and the actions', () => {
    renderWithProviders(
      <PageHeader
        title={<span>Curso</span>}
        subtitle={<em>Borrador</em>}
        breadcrumbs={<nav aria-label="Migas">Estudio / Cursos</nav>}
        actions={<button type="button">Publicar</button>}
      >
        <div role="tablist" aria-label="Secciones" />
      </PageHeader>
    )
    const order = [
      screen.getByRole('navigation', { name: 'Migas' }),
      screen.getByRole('heading', { level: 1 }),
      screen.getByRole('button'),
      screen.getByRole('tablist')
    ]
    for (let index = 1; index < order.length; index++) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(screen.getByRole('heading', { level: 1, name: 'Curso' })).toBeInTheDocument()
    expect(screen.getByText('Borrador').tagName).toBe('EM')
  })

  it('gives the inner box the container class, to line up with the page body', () => {
    renderWithProviders(<PageHeader title="Cursos" containerClassName="mx-auto max-w-6xl" />)
    expect(root().firstElementChild).toHaveClass('mx-auto', 'max-w-6xl')
  })
})

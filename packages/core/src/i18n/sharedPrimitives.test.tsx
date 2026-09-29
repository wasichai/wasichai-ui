import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { PageSizePagination, Pagination } from '@wasichai/ui'

// the ui primitives ship no words: core's common bundle does. these tests render them in Spanish, the default
// language of renderWithProviders, so a missing or renamed key shows here and not only in an app
const noop = () => {}

describe('Pagination strings', () => {
  it('counts the records and names the page', () => {
    renderWithProviders(<Pagination page={1} totalPages={5} totalElements={47} onPage={noop} />)
    expect(screen.getByText('47 registros')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeInTheDocument()
  })

  it('writes one record in the singular', () => {
    renderWithProviders(<Pagination page={0} totalPages={1} totalElements={1} onPage={noop} />)
    expect(screen.getByText('1 registro')).toBeInTheDocument()
  })
})

describe('PageSizePagination strings', () => {
  it('names the rows picker and the range shown', () => {
    renderWithProviders(<PageSizePagination page={0} size={10} total={47} onPage={noop} onSize={noop} />)
    expect(screen.getByText('Filas')).toBeInTheDocument()
    expect(screen.getByText('1 a 10 de 47 registros')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeInTheDocument()
  })

  it('shows the range of the last, short page', () => {
    renderWithProviders(<PageSizePagination page={4} size={10} total={47} onPage={noop} onSize={noop} />)
    expect(screen.getByText('41 a 47 de 47 registros')).toBeInTheDocument()
  })

  it('writes an empty list as 0 a 0 de 0 registros', () => {
    renderWithProviders(<PageSizePagination page={0} size={10} total={0} onPage={noop} onSize={noop} />)
    expect(screen.getByText('0 a 0 de 0 registros')).toBeInTheDocument()
  })

  it('writes the same in English when the app is in English', () => {
    renderWithProviders(<PageSizePagination page={0} size={10} total={47} onPage={noop} onSize={noop} />, { language: 'en' })
    expect(screen.getByText('Rows')).toBeInTheDocument()
    expect(screen.getByText('1–10 of 47 records')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
  })
})

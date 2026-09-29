import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { ConfirmDialog, PageSizePagination, Pagination, PdfDialog } from '@wasichai/ui'
import { ApiError } from '../api/client'

// the ui primitives ship no words: core's common bundle does. these tests render them in Spanish, the default
// language of renderWithProviders, so a missing or renamed key shows here and not only in an app
const noop = () => {}
// whatever grouping Intl gives the es locale, the same one the number format inside the strings uses
const MILLION = (1_000_000).toLocaleString('es')

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

  // Intl.PluralRules('es') answers `many` for exact millions: without records_many i18next would print the raw key
  it('writes a million records in the plural, not as a raw key', () => {
    renderWithProviders(<Pagination page={0} totalPages={1} totalElements={1_000_000} onPage={noop} />)
    expect(screen.getByText(`${MILLION} registros`)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('common.')
  })

  // the page numbers go through the number format too, so a swapped formatter reaches them
  it('groups the digits of a large page count by the language', () => {
    const { unmount } = renderWithProviders(<Pagination page={9_999} totalPages={12_345} totalElements={123_450} onPage={noop} />)
    expect(screen.getByText(`Página ${(10_000).toLocaleString('es')} de ${(12_345).toLocaleString('es')}`)).toBeInTheDocument()
    unmount()

    renderWithProviders(<Pagination page={9_999} totalPages={12_345} totalElements={123_450} onPage={noop} />, { language: 'en' })
    expect(screen.getByText('Page 10,000 of 12,345')).toBeInTheDocument()
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

  it('writes the range of a million rows in the plural, not as a raw key', () => {
    renderWithProviders(<PageSizePagination page={0} size={10} total={1_000_000} onPage={noop} onSize={noop} />)
    expect(screen.getByText(`1 a 10 de ${MILLION} registros`)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('common.')
  })

  it('writes the same in English when the app is in English', () => {
    renderWithProviders(<PageSizePagination page={0} size={10} total={47} onPage={noop} onSize={noop} />, { language: 'en' })
    expect(screen.getByText('Rows')).toBeInTheDocument()
    expect(screen.getByText('1–10 of 47 records')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
  })
})

describe('ConfirmDialog strings', () => {
  it('labels the buttons Eliminar and Cancelar, and the close button Cerrar', () => {
    renderWithProviders(<ConfirmDialog title="¿Eliminar?" description="No se puede deshacer." onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('writes the same in English when the app is in English', () => {
    renderWithProviders(<ConfirmDialog title="Delete?" description="It cannot be undone." onConfirm={noop} onCancel={noop} />, { language: 'en' })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})

describe('PdfDialog strings', () => {
  const pdf = () => Promise.resolve({ blob: new Blob(['%PDF']), filename: 'pu.pdf' })
  const pending = () => new Promise<never>(noop)
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }

  // jsdom has no object urls
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:pdf')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = original.create
    URL.revokeObjectURL = original.revoke
  })

  it('says Generando… while it loads, and labels Imprimir, Descargar and Cerrar', () => {
    renderWithProviders(<PdfDialog title="PU" source="a" load={pending} onClose={noop} />)
    expect(screen.getByRole('status')).toHaveTextContent('Generando…')
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).toHaveLength(2)
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Vista previa del documento en PDF, para imprimirlo o descargarlo.')
  })

  it('labels Descargar as a link once the document is ready', async () => {
    renderWithProviders(<PdfDialog title="PU" source="a" load={pdf} onClose={noop} />)
    expect(await screen.findByRole('link', { name: 'Descargar' })).toHaveAttribute('download', 'pu.pdf')
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled()
  })

  it('says the document could not be generated when what failed has no message', async () => {
    renderWithProviders(<PdfDialog title="PU" source="a" load={() => Promise.reject('nope')} onClose={noop} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar el documento')
  })

  // an ApiError's message is the status text when the body has none, and that is '' over HTTP/2
  it('says the document could not be generated for an ApiError with an empty message', async () => {
    renderWithProviders(<PdfDialog title="PU" source="a" load={() => Promise.reject(new ApiError(500, ''))} onClose={noop} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar el documento')
  })

  it('writes the same in English when the app is in English', async () => {
    renderWithProviders(<PdfDialog title="PU" source="a" load={pending} onClose={noop} />, { language: 'en' })
    expect(screen.getByRole('status')).toHaveTextContent('Generating…')
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(2)
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('A PDF preview, to print or download it.')
  })

  it('says the document could not be generated in English too', async () => {
    renderWithProviders(<PdfDialog title="PU" source="a" load={() => Promise.reject('nope')} onClose={noop} />, { language: 'en' })
    expect(await screen.findByRole('alert')).toHaveTextContent('The document could not be generated')
  })
})

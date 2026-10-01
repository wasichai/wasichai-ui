import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { PdfDialog, type PdfFile } from './pdf-dialog'

// no i18n instance here: t() answers its key. the words are asserted in core's sharedPrimitives test
const GENERATING = 'common.generating'
const PRINT = 'common.print'
const DOWNLOAD = 'common.download'
const CLOSE = 'common.close'
const FAILED = 'common.pdfFailed'

const TITLE = 'PU — 01-01-0001 — 2026'

// the blob url of a File is 'blob:<its name>', so a test reads which pdf an iframe shows
const pdf = (name: string): PdfFile => ({ blob: new File(['%PDF'], name), filename: name })
const urlOf = (name: string) => `blob:${name}`

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const noop = () => {}

// jsdom has no object urls: stub them, and put back what was there
const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
let create: Mock<typeof URL.createObjectURL>
let revoke: Mock<typeof URL.revokeObjectURL>

beforeEach(() => {
  create = vi.fn((blob: Blob | MediaSource) => urlOf((blob as File).name))
  revoke = vi.fn()
  URL.createObjectURL = create
  URL.revokeObjectURL = revoke
})

afterEach(() => {
  URL.createObjectURL = original.create
  URL.revokeObjectURL = original.revoke
})

describe('PdfDialog', () => {
  it('shows a status while the document loads, with print and download off', () => {
    render(<PdfDialog title={TITLE} source="a" load={() => new Promise(noop)} onClose={noop} />)
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(GENERATING)
    expect(screen.getByRole('button', { name: PRINT })).toBeDisabled()
    expect(screen.getByRole('button', { name: DOWNLOAD })).toBeDisabled()
    expect(screen.queryByTitle(TITLE)).not.toBeInTheDocument()
  })

  it('loads the source it was given', () => {
    const load = vi.fn(() => new Promise<PdfFile>(noop))
    render(<PdfDialog title={TITLE} source="/srtm/predios/p1/pu?anio=2026" load={load} onClose={noop} />)
    expect(load).toHaveBeenCalledExactlyOnceWith('/srtm/predios/p1/pu?anio=2026')
  })

  it('embeds the pdf once loaded, with print on and download as a link to the file', async () => {
    render(<PdfDialog title={TITLE} source="a" load={() => Promise.resolve(pdf('pu.pdf'))} onClose={noop} />)
    expect(await screen.findByTitle(TITLE)).toHaveAttribute('src', urlOf('pu.pdf'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: PRINT })).toBeEnabled()
    const download = screen.getByRole('link', { name: DOWNLOAD })
    expect(download).toHaveAttribute('href', urlOf('pu.pdf'))
    expect(download).toHaveAttribute('download', 'pu.pdf')
    expect(download).toHaveAttribute('data-slot', 'button')
  })

  it('prints the iframe, focused first', async () => {
    const user = userEvent.setup()
    render(<PdfDialog title={TITLE} source="a" load={() => Promise.resolve(pdf('pu.pdf'))} onClose={noop} />)
    const frame = (await screen.findByTitle(TITLE)) as HTMLIFrameElement
    // jsdom's frame window has no print
    const calls: string[] = []
    frame.contentWindow!.focus = () => calls.push('focus')
    frame.contentWindow!.print = () => calls.push('print')
    await user.click(screen.getByRole('button', { name: PRINT }))
    expect(calls).toEqual(['focus', 'print'])
  })

  it('puts the hook a theme sheet styles it by on the content', () => {
    render(<PdfDialog title={TITLE} source="a" load={() => new Promise(noop)} onClose={noop} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-slot', 'pdf-dialog')
  })

  describe('closing', () => {
    // two buttons are named Close: the dialog's X, and the one of the footer, the only one that is a Button
    const footerClose = () => screen.getAllByRole('button', { name: CLOSE }).find((button) => button.dataset.slot === 'button')!
    const xClose = () => screen.getAllByRole('button', { name: CLOSE }).find((button) => button.dataset.slot !== 'button')!

    it.each([
      ['the Close button', () => userEvent.click(footerClose())],
      ['the X', () => userEvent.click(xClose())],
      ['Escape', () => userEvent.keyboard('{Escape}')]
    ])('revokes the url and calls onClose on %s', async (_way, close) => {
      const onClose = vi.fn()
      render(<PdfDialog title={TITLE} source="a" load={() => Promise.resolve(pdf('pu.pdf'))} onClose={onClose} />)
      await screen.findByTitle(TITLE)
      expect(revoke).not.toHaveBeenCalled()

      await close()
      expect(revoke).toHaveBeenCalledExactlyOnceWith(urlOf('pu.pdf'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('revokes the url once, though the caller then unmounts it', async () => {
      const { unmount } = render(<PdfDialog title={TITLE} source="a" load={() => Promise.resolve(pdf('pu.pdf'))} onClose={() => unmount()} />)
      await screen.findByTitle(TITLE)
      await userEvent.click(footerClose())
      expect(revoke).toHaveBeenCalledExactlyOnceWith(urlOf('pu.pdf'))
    })

    it('closes while it still loads, and drops the late pdf without making a url of it', async () => {
      const pending = deferred<PdfFile>()
      const onClose = vi.fn()
      const { unmount } = render(<PdfDialog title={TITLE} source="a" load={() => pending.promise} onClose={onClose} />)
      await userEvent.click(footerClose())
      expect(onClose).toHaveBeenCalledTimes(1)
      unmount()

      pending.resolve(pdf('late.pdf'))
      await act(() => pending.promise)
      expect(create).not.toHaveBeenCalled()
    })
  })

  it('revokes the url when it is unmounted', async () => {
    const { unmount } = render(<PdfDialog title={TITLE} source="a" load={() => Promise.resolve(pdf('pu.pdf'))} onClose={noop} />)
    await screen.findByTitle(TITLE)
    expect(revoke).not.toHaveBeenCalled()

    unmount()
    expect(revoke).toHaveBeenCalledExactlyOnceWith(urlOf('pu.pdf'))
  })

  describe('a new source', () => {
    it('loads again: the status back, the first url revoked', async () => {
      const load = vi.fn((source: string) => Promise.resolve(pdf(`${source}.pdf`)))
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={load} onClose={noop} />)
      expect(await screen.findByTitle(TITLE)).toHaveAttribute('src', urlOf('a.pdf'))

      const second = deferred<PdfFile>()
      load.mockReturnValueOnce(second.promise)
      rerender(<PdfDialog title={TITLE} source="b" load={load} onClose={noop} />)
      expect(load).toHaveBeenLastCalledWith('b')
      expect(revoke).toHaveBeenCalledExactlyOnceWith(urlOf('a.pdf'))
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByTitle(TITLE)).not.toBeInTheDocument()

      second.resolve(pdf('b.pdf'))
      expect(await screen.findByTitle(TITLE)).toHaveAttribute('src', urlOf('b.pdf'))
    })

    it('drops the first, late resolution: the iframe shows the second url only', async () => {
      const first = deferred<PdfFile>()
      const second = deferred<PdfFile>()
      const load = vi.fn((source: string) => (source === 'a' ? first : second).promise)
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={load} onClose={noop} />)
      rerender(<PdfDialog title={TITLE} source="b" load={load} onClose={noop} />)

      second.resolve(pdf('b.pdf'))
      expect(await screen.findByTitle(TITLE)).toHaveAttribute('src', urlOf('b.pdf'))

      first.resolve(pdf('a.pdf'))
      await act(() => first.promise)
      expect(screen.getByTitle(TITLE)).toHaveAttribute('src', urlOf('b.pdf'))
      expect(screen.getByRole('link', { name: DOWNLOAD })).toHaveAttribute('download', 'b.pdf')
      // the late one is not turned into a url, so there is nothing to leak
      expect(create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'b.pdf' }))
      expect(revoke).not.toHaveBeenCalled()
    })

    it('drops the first resolution while the second still loads', async () => {
      const first = deferred<PdfFile>()
      const second = deferred<PdfFile>()
      const load = vi.fn((source: string) => (source === 'a' ? first : second).promise)
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={load} onClose={noop} />)
      rerender(<PdfDialog title={TITLE} source="b" load={load} onClose={noop} />)

      first.resolve(pdf('a.pdf'))
      await act(() => first.promise)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByTitle(TITLE)).not.toBeInTheDocument()
      expect(create).not.toHaveBeenCalled()
    })

    it('drops the first, late failure: no alert and no onError', async () => {
      const first = deferred<PdfFile>()
      const second = deferred<PdfFile>()
      const load = vi.fn((source: string) => (source === 'a' ? first : second).promise)
      const onError = vi.fn()
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={load} onError={onError} onClose={noop} />)
      rerender(<PdfDialog title={TITLE} source="b" load={load} onError={onError} onClose={noop} />)

      first.reject(new Error('boom'))
      await act(() => first.promise.catch(noop))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(onError).not.toHaveBeenCalled()
    })

    // an inline load and onError are a new function each render of the caller: that is not a new source
    it('does not load again when only the callbacks change', async () => {
      const load = vi.fn((source: string) => Promise.resolve(pdf(`${source}.pdf`)))
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={(source) => load(source)} onError={() => {}} onClose={noop} />)
      await screen.findByTitle(TITLE)

      rerender(<PdfDialog title={TITLE} source="a" load={(source) => load(source)} onError={() => {}} onClose={noop} />)
      expect(load).toHaveBeenCalledTimes(1)
      expect(screen.getByTitle(TITLE)).toHaveAttribute('src', urlOf('a.pdf'))
      expect(revoke).not.toHaveBeenCalled()
    })
  })

  describe('when the document cannot be made', () => {
    it('shows the error message as an alert, with print and download off, and tells onError once', async () => {
      const error = new Error('El predio tiene 2 titulares')
      const onError = vi.fn()
      render(<PdfDialog title={TITLE} source="a" load={() => Promise.reject(error)} onError={onError} onClose={noop} />)

      expect(await screen.findByRole('alert')).toHaveTextContent('El predio tiene 2 titulares')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByTitle(TITLE)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: PRINT })).toBeDisabled()
      expect(screen.getByRole('button', { name: DOWNLOAD })).toBeDisabled()
      expect(onError).toHaveBeenCalledExactlyOnceWith(error)
      expect(create).not.toHaveBeenCalled()
    })

    it('says the document could not be generated when what failed is not an Error', async () => {
      render(<PdfDialog title={TITLE} source="a" load={() => Promise.reject('nope')} onClose={noop} />)
      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED)
    })

    // core's ApiError falls back to the status text, which is '' over HTTP/2: an empty alert says nothing
    it('says the document could not be generated when the Error has no message', async () => {
      render(<PdfDialog title={TITLE} source="a" load={() => Promise.reject(new Error(''))} onClose={noop} />)
      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED)
    })

    it('shows what renderError makes of the failure, in the alert', async () => {
      const failure = { message: 'ambiguo', faltan: ['titular', 'año'] }
      const onError = vi.fn()
      const renderError = vi.fn((error: unknown) => <p>Faltan parámetros: {(error as typeof failure).faltan.join(', ')}</p>)
      render(<PdfDialog title={TITLE} source="a" load={() => Promise.reject(failure)} onError={onError} renderError={renderError} onClose={noop} />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Faltan parámetros: titular, año')
      expect(renderError).toHaveBeenCalledWith(failure)
      expect(screen.getByRole('alert')).not.toHaveTextContent(FAILED)
      expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
    })

    it('tells the latest onError, not the one it was mounted with', async () => {
      const pending = deferred<PdfFile>()
      const first = vi.fn()
      const latest = vi.fn()
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={() => pending.promise} onError={first} onClose={noop} />)
      rerender(<PdfDialog title={TITLE} source="a" load={() => pending.promise} onError={latest} onClose={noop} />)

      const error = new Error('boom')
      pending.reject(error)
      await screen.findByRole('alert')
      expect(latest).toHaveBeenCalledExactlyOnceWith(error)
      expect(first).not.toHaveBeenCalled()
    })

    it('loads again on a new source, and the alert goes', async () => {
      const load = vi.fn((source: string) => (source === 'a' ? Promise.reject(new Error('boom')) : Promise.resolve(pdf('b.pdf'))))
      const { rerender } = render(<PdfDialog title={TITLE} source="a" load={load} onClose={noop} />)
      await screen.findByRole('alert')

      rerender(<PdfDialog title={TITLE} source="b" load={load} onClose={noop} />)
      expect(await screen.findByTitle(TITLE)).toHaveAttribute('src', urlOf('b.pdf'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})

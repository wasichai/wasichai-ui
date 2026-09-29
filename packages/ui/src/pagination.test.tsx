import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageSizePagination, Pagination } from './pagination'

// no i18n instance here: t() answers its key. the words are asserted in core's sharedPrimitives test
const PREVIOUS = 'common.previousPage'
const NEXT = 'common.nextPage'

describe('Pagination', () => {
  it('puts the hooks a theme sheet styles it by on the root', () => {
    const { container } = render(<Pagination page={0} totalPages={3} totalElements={30} onPage={() => {}} />)
    expect(container.firstElementChild).toHaveAttribute('data-slot', 'pagination')
    expect(container.firstElementChild).toHaveAttribute('data-mode', 'server')
  })

  it('moves one page at a time and disables the arrow at each end', async () => {
    const user = userEvent.setup()
    const onPage = vi.fn()
    const { rerender } = render(<Pagination page={0} totalPages={3} totalElements={30} onPage={onPage} />)
    expect(screen.getByRole('button', { name: PREVIOUS })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: NEXT }))
    expect(onPage).toHaveBeenLastCalledWith(1)

    rerender(<Pagination page={1} totalPages={3} totalElements={30} onPage={onPage} />)
    await user.click(screen.getByRole('button', { name: PREVIOUS }))
    expect(onPage).toHaveBeenLastCalledWith(0)

    rerender(<Pagination page={2} totalPages={3} totalElements={30} onPage={onPage} />)
    expect(screen.getByRole('button', { name: NEXT })).toBeDisabled()
    expect(screen.getByRole('button', { name: PREVIOUS })).toBeEnabled()
  })

  it('draws no arrows for a single page', () => {
    render(<Pagination page={0} totalPages={1} totalElements={4} onPage={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('PageSizePagination', () => {
  const noop = () => {}

  it('puts the hooks a theme sheet styles it by on the root and the picker', () => {
    const { container } = render(<PageSizePagination page={0} size={10} total={47} onPage={noop} onSize={noop} />)
    expect(container.firstElementChild).toHaveAttribute('data-slot', 'pagination')
    expect(container.firstElementChild).toHaveAttribute('data-mode', 'client')
    expect(screen.getByRole('combobox')).toHaveAttribute('data-slot', 'native-select')
  })

  it('moves one page at a time and disables the arrow at each end', async () => {
    const user = userEvent.setup()
    const onPage = vi.fn()
    const { rerender } = render(<PageSizePagination page={0} size={10} total={47} onPage={onPage} onSize={noop} />)
    expect(screen.getByRole('button', { name: PREVIOUS })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: NEXT }))
    expect(onPage).toHaveBeenLastCalledWith(1)

    rerender(<PageSizePagination page={2} size={10} total={47} onPage={onPage} onSize={noop} />)
    await user.click(screen.getByRole('button', { name: PREVIOUS }))
    expect(onPage).toHaveBeenLastCalledWith(1)

    // 47 rows at 10 a page: the last page is 4
    rerender(<PageSizePagination page={4} size={10} total={47} onPage={onPage} onSize={noop} />)
    expect(screen.getByRole('button', { name: NEXT })).toBeDisabled()
    expect(screen.getByRole('button', { name: PREVIOUS })).toBeEnabled()
  })

  it('disables both arrows when there is nothing to page', () => {
    render(<PageSizePagination page={0} size={10} total={0} onPage={noop} onSize={noop} />)
    expect(screen.getByRole('button', { name: PREVIOUS })).toBeDisabled()
    expect(screen.getByRole('button', { name: NEXT })).toBeDisabled()
  })

  it('offers 5, 10 and 25 rows by default and reports the size picked as a number', async () => {
    const user = userEvent.setup()
    const onSize = vi.fn()
    render(<PageSizePagination page={0} size={10} total={47} onPage={noop} onSize={onSize} />)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['5', '10', '25'])
    expect(screen.getByRole('combobox')).toHaveValue('10')

    await user.selectOptions(screen.getByRole('combobox'), '25')
    expect(onSize).toHaveBeenCalledWith(25)
  })

  it('offers the sizes the caller gives', () => {
    render(<PageSizePagination page={0} size={20} total={47} onPage={noop} onSize={noop} sizes={[20, 50]} />)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['20', '50'])
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './confirm-dialog'

// no i18n instance here: t() answers its key. the words are asserted in core's sharedPrimitives test
const DELETE = 'common.delete'
const CANCEL = 'common.cancel'
const CLOSE = 'common.close'

const noop = () => {}

describe('ConfirmDialog', () => {
  it('shows the title, the description and the two buttons', () => {
    render(<ConfirmDialog title="Delete this record?" description="It cannot be undone." onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('dialog', { name: 'Delete this record?' })).toHaveAccessibleDescription('It cannot be undone.')
    expect(screen.getByRole('button', { name: DELETE })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CANCEL })).toBeInTheDocument()
  })

  it('takes the labels of the two buttons from the caller', () => {
    render(<ConfirmDialog title="Sure?" description="Really." confirmLabel="Yes, drop it" cancelLabel="No, keep it" onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('button', { name: 'Yes, drop it' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No, keep it' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DELETE })).not.toBeInTheDocument()
  })

  it('draws the confirm button as danger, or primary when asked', () => {
    const { rerender } = render(<ConfirmDialog title="Sure?" description="Really." onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('button', { name: DELETE })).toHaveAttribute('data-variant', 'danger')
    expect(screen.getByRole('button', { name: CANCEL })).toHaveAttribute('data-variant', 'secondary')

    rerender(<ConfirmDialog title="Sure?" description="Really." variant="primary" onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('button', { name: DELETE })).toHaveAttribute('data-variant', 'primary')
  })

  it('calls onConfirm when confirm is clicked, and not onCancel', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Sure?" description="Really." onConfirm={onConfirm} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: DELETE }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('disables confirm while busy, so the action runs once', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ConfirmDialog title="Sure?" description="Really." busy onConfirm={onConfirm} onCancel={noop} />)
    const confirm = screen.getByRole('button', { name: DELETE })
    expect(confirm).toBeDisabled()
    await user.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: CANCEL })).toBeEnabled()
  })

  it('calls onCancel from the cancel button', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Sure?" description="Really." onConfirm={onConfirm} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: CANCEL }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel on Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Sure?" description="Really." onConfirm={noop} onCancel={onCancel} />)
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel from the dialog's close button", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Sure?" description="Really." onConfirm={onConfirm} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: CLOSE }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel on a click outside, on the overlay', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Sure?" description="Really." onConfirm={onConfirm} onCancel={onCancel} />)
    // the overlay is Dialog's: no role, no slot. it is the one element painted bg-overlay
    const overlay = document.querySelector('.bg-overlay')!
    expect(overlay).toBeInTheDocument()
    await user.click(overlay)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows the error as an alert, and no alert without one', () => {
    const { rerender } = render(<ConfirmDialog title="Sure?" description="Really." onConfirm={noop} onCancel={noop} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<ConfirmDialog title="Sure?" description="Really." error="It has declaraciones." onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('alert')).toHaveTextContent('It has declaraciones.')
  })

  it('puts the hook a theme sheet styles it by on the content', () => {
    render(<ConfirmDialog title="Sure?" description="Really." onConfirm={noop} onCancel={noop} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-slot', 'confirm-dialog')
  })
})

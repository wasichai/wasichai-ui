import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from './copy-button'

const ID = '0b6c1f9e-4d1a-4c55-9f1e-6a0f2f2b7c11'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// fireEvent, not userEvent: userEvent puts its own clipboard stub on the navigator
function stubClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  return writeText
}

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

describe('CopyButton', () => {
  it('puts the value on the clipboard and says so', async () => {
    const writeText = stubClipboard()
    render(<CopyButton value={ID} label="Copiar id" copiedLabel="Copiado" />)

    await click('Copiar id')

    expect(writeText).toHaveBeenCalledWith(ID)
    expect(screen.getByRole('button', { name: 'Copiado' })).toHaveAttribute('data-slot', 'copy-button')
  })

  it('goes back to its label after a moment', async () => {
    vi.useFakeTimers()
    stubClipboard()
    render(<CopyButton value={ID} label="Copiar id" copiedLabel="Copiado" />)
    await click('Copiar id')
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getByRole('button', { name: 'Copiar id' })).toBeInTheDocument()
  })

  it('stays as it was when the clipboard refuses', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))
    render(<CopyButton value={ID} label="Copiar id" copiedLabel="Copiado" />)

    await click('Copiar id')

    expect(screen.getByRole('button', { name: 'Copiar id' })).toBeInTheDocument()
  })
})

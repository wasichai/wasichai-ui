import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

function Modal({ title, children }: { title: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir {title}
      </button>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Detalle</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

const root = () => document.documentElement

describe('Dialog', () => {
  // a strict CSP (style-src 'self') blocks an injected <style>: the lock must not need one (#58)
  it('locks the page scroll without injecting a style element', async () => {
    const styles = document.querySelectorAll('style').length
    render(<Modal title="Predio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir Predio' }))

    expect(screen.getByRole('dialog', { name: 'Predio' })).toBeInTheDocument()
    expect(document.querySelectorAll('style')).toHaveLength(styles)
    expect(root().style.overflow).toBe('hidden')
  })

  it('gives the page its scroll back on close', async () => {
    root().style.overflow = 'auto'
    render(<Modal title="Predio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir Predio' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(root().style.overflow).toBe('auto')
    root().style.overflow = ''
  })

  it('keeps the page locked until the last of two nested dialogs closes', async () => {
    render(
      <Modal title="Predio">
        <Modal title="Titular" />
      </Modal>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Abrir Predio' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Titular' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Titular' })).not.toBeInTheDocument()
    expect(root().style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(root().style.overflow).toBe('')
  })

  it('closes on a click on its overlay', async () => {
    render(<Modal title="Predio" />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Predio' }))

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    await userEvent.click(overlay)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

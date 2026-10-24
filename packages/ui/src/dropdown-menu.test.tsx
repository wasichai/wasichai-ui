import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu'

function Menu({ onDelete }: { onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Más acciones</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          Eliminar flujo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('opens from its trigger and runs the picked item', async () => {
    const onDelete = vi.fn()
    render(<Menu onDelete={onDelete} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    const item = screen.getByRole('menuitem', { name: 'Eliminar flujo' })
    expect(screen.getByRole('menu')).toHaveAttribute('data-slot', 'dropdown-menu')
    expect(item).toHaveAttribute('data-variant', 'danger')
    await userEvent.click(item)

    expect(onDelete).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('leaves the page usable when an item opens something else', async () => {
    render(<Menu onDelete={() => undefined} />)

    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Eliminar flujo' }))

    expect(document.body.style.pointerEvents).not.toBe('none')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'
import { cn, extendCn } from './cn'
import { Th } from './table'

// its own file: extendCn changes the module's cn for the rest of the file (vitest isolates files)
extendCn({ fontSizes: ['display', 'title-1', 'title-2', 'title-3', 'read-body'] })

describe('cn after extendCn (#127)', () => {
  it('keeps a colour beside a declared size, in either order', () => {
    expect(cn('text-ink', 'text-title-1')).toBe('text-ink text-title-1')
    expect(cn('text-title-1', 'text-ink')).toBe('text-title-1 text-ink')
  })

  it('lets a declared size win over a built-in one, and over another declared one', () => {
    expect(cn('text-sm', 'text-title-1')).toBe('text-title-1')
    expect(cn('text-sm text-danger', 'text-title-2')).toBe('text-danger text-title-2')
    expect(cn('text-display', 'text-read-body')).toBe('text-read-body')
  })

  it('still merges what it merged before', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
    expect(cn('text-ink', 'text-danger')).toBe('text-danger')
  })

  it('keeps the colour of a component given a declared size', () => {
    render(
      <table>
        <thead>
          <tr>
            <Th className="text-title-3">Nombre</Th>
          </tr>
        </thead>
      </table>
    )
    const head = screen.getByRole('columnheader', { name: 'Nombre' })
    expect(head).toHaveClass('text-ink-muted', 'text-title-3')
    expect(head).not.toHaveClass('text-xs')

    render(<Button className="text-title-3">Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveClass('text-title-3')
    expect(button.className).toMatch(/\btext-on-brand\b/)
  })
})

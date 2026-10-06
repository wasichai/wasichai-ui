import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input, Textarea } from './input'

describe('Input', () => {
  it('carries the hook a theme sheet styles it by, and keeps its look', () => {
    render(<Input aria-label="Nombre" />)
    const input = screen.getByRole('textbox', { name: 'Nombre' })
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input).toHaveClass('h-9', 'rounded-md', 'border-border')
  })
})

describe('Textarea', () => {
  it('carries the hook a theme sheet styles it by, and keeps its look', () => {
    render(<Textarea aria-label="Nota" />)
    const textarea = screen.getByRole('textbox', { name: 'Nota' })
    expect(textarea).toHaveAttribute('data-slot', 'textarea')
    expect(textarea).toHaveClass('min-h-20', 'rounded-md', 'border-border')
  })
})

// a locked field reads as locked whatever control draws it: the same disabled look as Input
describe('disabled look', () => {
  it('is the same on Input and Textarea', () => {
    render(
      <>
        <Input aria-label="Nombre" disabled />
        <Textarea aria-label="Nota" disabled />
      </>
    )
    for (const name of ['Nombre', 'Nota']) {
      expect(screen.getByRole('textbox', { name })).toHaveClass('disabled:cursor-not-allowed', 'disabled:bg-surface-muted')
    }
  })
})

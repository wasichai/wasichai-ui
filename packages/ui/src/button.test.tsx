import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('is a primary medium button unless told otherwise', () => {
    render(<Button>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveClass('bg-brand', 'h-9')
  })

  it('lends its look to its child with asChild', () => {
    render(
      <Button asChild variant="secondary">
        <a href="/x">Ir</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Ir' })).toHaveClass('border-border')
  })
})

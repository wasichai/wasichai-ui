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

  it('carries the hooks a theme sheet styles it by, with the resolved defaults', () => {
    render(<Button>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('data-variant', 'primary')
    expect(button).toHaveAttribute('data-size', 'md')
  })

  it('reflects an explicit variant and size in its hooks', () => {
    render(
      <Button variant="danger" size="sm">
        Borrar
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Borrar' })
    expect(button).toHaveAttribute('data-variant', 'danger')
    expect(button).toHaveAttribute('data-size', 'sm')
    expect(button).toHaveClass('bg-danger', 'h-8')
  })

  it('hands its hooks to its child with asChild', () => {
    render(
      <Button asChild variant="ghost">
        <a href="/x">Ir</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Ir' })
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(link).toHaveAttribute('data-variant', 'ghost')
    expect(link).toHaveAttribute('data-size', 'md')
  })

  it("lets a caller's own hook win over the computed one", () => {
    render(
      <Button variant="ghost" size="icon" data-variant="round" aria-label="Menú">
        ☰
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Menú' })
    expect(button).toHaveAttribute('data-variant', 'round')
    expect(button).toHaveClass('text-ink-muted')
  })

  // cva draws no variant for null, so no hook names one
  it('names no variant or size when told null, as cva draws none', () => {
    render(
      <Button variant={null} size={null}>
        Plano
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Plano' })
    expect(button).not.toHaveAttribute('data-variant')
    expect(button).not.toHaveAttribute('data-size')
    expect(button).not.toHaveClass('bg-brand')
  })
})

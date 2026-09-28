import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './card'

describe('Card', () => {
  it('carries the hook a theme sheet styles it by, and keeps its look', () => {
    render(<Card aria-label="Ficha">x</Card>)
    const card = screen.getByLabelText('Ficha')
    expect(card).toHaveAttribute('data-slot', 'card')
    expect(card).toHaveClass('rounded-card', 'border-border', 'bg-surface')
  })
})

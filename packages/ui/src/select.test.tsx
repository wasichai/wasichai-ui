import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Select, SelectTrigger, SelectValue } from './select'

describe('SelectTrigger', () => {
  it('carries the hook a theme sheet styles the field by, and keeps its look', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Estado">
          <SelectValue placeholder="Elegir" />
        </SelectTrigger>
      </Select>
    )
    const trigger = screen.getByRole('combobox', { name: 'Estado' })
    expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
    expect(trigger).toHaveClass('h-9', 'rounded-md')
  })
})

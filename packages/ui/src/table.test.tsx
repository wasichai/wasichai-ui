import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge, Table, Td, Th } from './table'

describe('Table', () => {
  it('puts the hooks a theme sheet styles it by on the table, its cells and its badges', () => {
    render(
      <Table aria-label="Casos">
        <thead>
          <tr>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>
              <Badge>Abierto</Badge>
            </Td>
          </tr>
        </tbody>
      </Table>
    )
    const table = screen.getByRole('table', { name: 'Casos' })
    expect(table).toHaveAttribute('data-slot', 'table')
    expect(table.parentElement).not.toHaveAttribute('data-slot')
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toHaveAttribute('data-slot', 'table-head')
    expect(screen.getByRole('cell', { name: 'Abierto' })).toHaveAttribute('data-slot', 'table-cell')
    expect(screen.getByText('Abierto')).toHaveAttribute('data-slot', 'badge')
  })

  it('keeps its look', () => {
    render(
      <Table aria-label="Casos">
        <tbody>
          <tr>
            <Td>x</Td>
          </tr>
        </tbody>
      </Table>
    )
    const table = screen.getByRole('table', { name: 'Casos' })
    expect(table).toHaveClass('w-full', 'border-collapse')
    expect(table.parentElement).toHaveClass('overflow-x-auto')
  })
})

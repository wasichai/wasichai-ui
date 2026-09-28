import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tabs } from './tabs'

const tabs = [
  { id: 'datos', label: 'Datos', render: () => <p>formulario</p> },
  { id: 'historial', label: 'Historial', render: () => <p>historial</p> }
]

describe('Tabs', () => {
  it('puts the hooks a theme sheet styles it by on the root, the strip, each tab and the panel', () => {
    const { container } = render(<Tabs tabs={tabs} label="Secciones" />)
    expect(container.firstElementChild).toHaveAttribute('data-slot', 'tabs')
    expect(screen.getByRole('tablist', { name: 'Secciones' })).toHaveAttribute('data-slot', 'tabs-list')
    for (const tab of screen.getAllByRole('tab')) expect(tab).toHaveAttribute('data-slot', 'tabs-trigger')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-slot', 'tabs-content')
  })

  it('mounts a panel only once its tab is opened, and keeps it mounted after', async () => {
    const user = userEvent.setup()
    render(<Tabs tabs={tabs} label="Secciones" />)
    expect(screen.getByText('formulario')).toBeVisible()
    expect(screen.queryByText('historial')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('historial')).toBeVisible()
    expect(screen.getByText('formulario')).not.toBeVisible()
    for (const panel of screen.getAllByRole('tabpanel', { hidden: true })) expect(panel).toHaveAttribute('data-slot', 'tabs-content')
  })
})

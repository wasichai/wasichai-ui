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

// roving focus (WAI-ARIA tabs): only the open tab is in the tab order, the arrows walk the strip.
// manual activation: a panel mounts only when picked, because mounting fetches
describe('Tabs keyboard', () => {
  const three = [
    { id: 'datos', label: 'Datos', render: () => <p>formulario</p> },
    { id: 'historial', label: 'Historial', render: () => <p>historial</p> },
    { id: 'documentos', label: 'Documentos', render: () => <p>documentos</p> }
  ]

  it('walks the strip with the arrows, Home and End, and opens the tab Enter picks', async () => {
    const user = userEvent.setup()
    render(<Tabs tabs={three} label="Secciones" />)

    await user.tab()
    expect(screen.getByRole('tab', { name: 'Datos' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveFocus()
    expect(screen.queryByText('historial')).not.toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('historial')).toBeVisible()

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Datos' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Datos' })).toHaveFocus()
  })
})

describe('Tabs panels', () => {
  // a tab that disappears while open leaves the strip on the first one: that one shows its panel
  it('shows the panel of the tab it falls back to', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Tabs tabs={tabs} label="Secciones" />)
    await user.click(screen.getByRole('tab', { name: 'Historial' }))

    rerender(<Tabs tabs={[{ id: 'mapa', label: 'Mapa', render: () => <p>mapa</p> }, tabs[0]]} label="Secciones" />)

    expect(screen.getByRole('tab', { name: 'Mapa' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('mapa')).toBeVisible()
  })

  // an admin types tab titles with spaces, and two strips can name their tabs alike
  it('ties each panel to its own tab whatever the ids look like', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Tabs tabs={[{ id: 'Datos generales-0', label: 'Datos generales', render: () => <p>uno</p> }]} label="Primera" />
        <Tabs tabs={[{ id: 'Datos generales-0', label: 'Otros datos', render: () => <p>dos</p> }]} label="Segunda" />
      </>
    )
    expect(screen.getByRole('tabpanel', { name: 'Datos generales' })).toHaveTextContent('uno')
    expect(screen.getByRole('tabpanel', { name: 'Otros datos' })).toHaveTextContent('dos')
    await user.click(screen.getByRole('tab', { name: 'Otros datos' }))
    expect(screen.getByRole('tab', { name: 'Otros datos' })).toHaveAttribute('aria-controls', screen.getByRole('tabpanel', { name: 'Otros datos' }).id)
  })
})

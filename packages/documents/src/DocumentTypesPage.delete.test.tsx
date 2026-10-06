import { Children, isValidElement, type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { coreModule } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { DocumentTypesPage } from './DocumentTypesPage'
import { documentsModule } from './module'

// radix opens its listbox in a portal behind pointer capture jsdom does not implement: a native
// select answers the same question, which value the page received
vi.mock('@wasichai/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wasichai/ui')>()
  const SelectTrigger = ({ children }: { children?: ReactNode }) => <>{children}</>
  return {
    ...actual,
    SelectTrigger,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children?: ReactNode }) => (
      <select aria-label={label(children)} value={value} onChange={(event) => onValueChange(event.target.value)}>
        <option value="" />
        {children}
      </select>
    )
  }

  function label(children: ReactNode): string | undefined {
    const trigger = Children.toArray(children).find((child) => isValidElement(child) && child.type === SelectTrigger)
    return isValidElement(trigger) ? (trigger.props as { 'aria-label'?: string })['aria-label'] : undefined
  }
})

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

describe('DocumentTypesPage delete', () => {
  // a type that ever issued a document answers 409: the delete used to reject unhandled, with nothing on screen
  it('says why a delete was refused, and keeps the type open', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fetch = mockFetch([
      { path: '/objects', body: [{ id: 'o1', name: 'predio', label: 'Predio' }] },
      {
        path: '/metadata/objects/predio',
        body: { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
      },
      { path: '/objects/predio/relationships', body: [] },
      {
        path: '/objects/predio/document-types',
        body: [{ id: 'd1', name: 'constancia', label: 'Constancia', prefix: 'CON', template: { type: 'doc', content: [] } }]
      },
      { method: 'DELETE', path: '/objects/predio/document-types/constancia', status: 409, body: { title: 'Conflict', detail: 'Ya emitió documentos' } }
    ])
    renderWithProviders(<DocumentTypesPage />, { modules: [coreModule, documentsModule()] })

    await userEvent.selectOptions(screen.getByRole('combobox'), await screen.findByRole('option', { name: 'Predio' }))
    await userEvent.click(await screen.findByRole('button', { name: /Constancia/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya emitió documentos')
    expect(screen.getByLabelText('Nombre')).toHaveValue('constancia')
  })
})

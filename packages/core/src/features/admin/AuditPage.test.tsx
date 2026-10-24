import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { issueModule } from '../../test/fakeModules'
import { AuditPage } from './AuditPage'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('AuditPage', () => {
  it('names a module value and column when a change row is opened', async () => {
    fetch = mockFetch([
      { path: '/objects', body: [] },
      {
        path: '/metadata/objects/predio',
        body: { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
      },
      {
        path: /^\/audit\?/,
        body: [
          {
            id: 'a1',
            userEmail: 'ana@wasichai.test',
            objectName: 'predio',
            recordId: 'r1',
            operation: 'UPDATE',
            occurredAt: '2026-09-17T11:00:00Z',
            changes: [{ field: 'sketch', before: null, after: { strokes: [[0, 0, 1, 1]] } }]
          }
        ]
      }
    ])
    renderWithProviders(<AuditPage />, { modules: [issueModule] })

    await userEvent.click(await screen.findByRole('button', { name: 'Ver cambios' }))

    expect(await screen.findByText('Boceto')).toBeInTheDocument()
    expect(screen.getByText('boceto actualizado')).toBeInTheDocument()
  })

  it('lists the reason and the service account', async () => {
    const entry = { objectName: 'predio', recordId: 'r1', operation: 'CREATE', occurredAt: '2026-09-17T11:00:00Z', changes: [] }
    fetch = mockFetch([
      { path: '/objects', body: [] },
      {
        path: /^\/audit\?/,
        body: [
          { ...entry, id: 'a1', userEmail: 'x@service-accounts.invalid', serviceAccount: 'rentas', reason: 'carga nocturna del padrón' },
          // a server from before the reason sends neither key
          { ...entry, id: 'a2', userEmail: 'ana@wasichai.test' }
        ]
      }
    ])
    renderWithProviders(<AuditPage />)

    expect(await screen.findByRole('columnheader', { name: 'Motivo' })).toBeInTheDocument()
    const [, serviceRow, oldRow] = screen.getAllByRole('row')
    expect(serviceRow).toHaveTextContent('rentas')
    expect(serviceRow).toHaveTextContent('Cuenta de servicio')
    expect(serviceRow).not.toHaveTextContent('x@service-accounts.invalid')
    expect(screen.getByText('carga nocturna del padrón')).toHaveAttribute('title', 'carga nocturna del padrón')
    expect(oldRow).toHaveTextContent('ana@wasichai.test')
    expect(oldRow.querySelectorAll('td')[5]).toHaveTextContent('—')
  })

  describe('when and which record', () => {
    const ID = '0b6c1f9e-4d1a-4c55-9f1e-6a0f2f2b7c11'
    // 16:30 UTC is 11:30 in Lima
    const entry = {
      id: 'a1',
      objectName: 'predio',
      recordId: ID,
      operation: 'CREATE',
      occurredAt: '2026-09-17T16:30:00Z',
      changes: [],
      userEmail: 'ana@wasichai.test'
    }
    const serve = () =>
      (fetch = mockFetch([
        { path: '/objects', body: [] },
        { path: /^\/audit\?/, body: [entry] }
      ]))

    it('shows the exact time in config.timeZone, the relative one in the title', async () => {
      serve()
      renderWithProviders(<AuditPage />, { config: { timeZone: 'America/Lima' } })

      const time = (await screen.findByText(ID)).closest('tr')!.querySelector('time')!
      expect(time).toHaveTextContent('11:30')
      expect(time).toHaveAttribute('title', expect.stringContaining('hace'))
    })

    it('keeps the relative time without a zone', async () => {
      serve()
      renderWithProviders(<AuditPage />)

      const time = (await screen.findByText(ID)).closest('tr')!.querySelector('time')!
      expect(time).toHaveTextContent('hace')
    })

    it('keeps the record id on one line, with a copy button', async () => {
      serve()
      renderWithProviders(<AuditPage />)

      const cell = (await screen.findByText(ID)).closest('td')!
      expect(cell).toHaveClass('whitespace-nowrap')
      expect(within(cell).getByRole('button', { name: 'Copiar id' })).toBeInTheDocument()
    })
  })
})

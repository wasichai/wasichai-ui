import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UseQueryResult } from '@tanstack/react-query'
import { Cuboid } from 'lucide-react'
import type { ReactNode } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { ApiError } from '../../api/client'
import type { EmptyStateProps, ErrorStateProps, LoadingStateProps, QueryStateProps } from '../../index'
import { EmptyState, ErrorState, LoadingState, QueryState } from './QueryState'

// the minimal shape QueryState reads, cast: a real UseQueryResult needs a QueryClient and a fetch
function fakeQuery<T>(state: { isPending?: boolean; isError?: boolean; error?: unknown; data?: T; refetch?: () => unknown }): UseQueryResult<T> {
  return { isPending: false, isError: false, error: null, data: undefined, refetch: vi.fn(), ...state } as unknown as UseQueryResult<T>
}

describe('QueryState', () => {
  it('shows the loading status while pending', () => {
    renderWithProviders(<QueryState query={fakeQuery<string>({ isPending: true })}>{(data) => <p>{data}</p>}</QueryState>)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
  })

  it('shows not found without a retry on a 404', () => {
    renderWithProviders(<QueryState query={fakeQuery({ isError: true, error: new ApiError(404, 'nope') })}>{() => <p>data</p>}</QueryState>)
    expect(screen.getByRole('alert')).toHaveTextContent('No se encontró el registro')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    expect(screen.queryByText('nope')).toBeNull()
  })

  it('shows forbidden without a retry on a 403', () => {
    renderWithProviders(<QueryState query={fakeQuery({ isError: true, error: new ApiError(403, 'nope') })}>{() => <p>data</p>}</QueryState>)
    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso para ver esto')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
    expect(screen.queryByText('nope')).toBeNull()
  })

  it('shows the failure, its message and a retry that refetches on any other error', async () => {
    const refetch = vi.fn()
    renderWithProviders(<QueryState query={fakeQuery({ isError: true, error: new Error('boom'), refetch })}>{() => <p>data</p>}</QueryState>)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar')
    expect(screen.getByText('boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders the children with the data on success', () => {
    renderWithProviders(<QueryState query={fakeQuery({ data: { name: 'Ana' } })}>{(data) => <p>hola {data.name}</p>}</QueryState>)
    expect(screen.getByText('hola Ana')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says the same in English when the app is in English', () => {
    renderWithProviders(<QueryState query={fakeQuery({ isError: true, error: new ApiError(403, 'nope') })}>{() => <p>data</p>}</QueryState>, {
      language: 'en'
    })
    expect(screen.getByRole('alert')).toHaveTextContent('You are not allowed to see this')
  })
})

describe('LoadingState', () => {
  it('takes a label instead of the default', () => {
    renderWithProviders(<LoadingState label="Buscando…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Buscando…')
  })
})

describe('EmptyState', () => {
  it('shows the title and what follows it', () => {
    renderWithProviders(
      <EmptyState title="Sin predios">
        <button type="button">Nuevo</button>
      </EmptyState>
    )
    expect(screen.getByText('Sin predios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument()
  })

  it('draws the icon it is given in place of the default', () => {
    const { container: withIcon } = renderWithProviders(<EmptyState title="a" icon={Cuboid} />)
    const { container: withDefault } = renderWithProviders(<EmptyState title="a" />)
    expect(withIcon.querySelector('svg')).toHaveClass('lucide-cuboid')
    expect(withDefault.querySelector('svg')).toHaveClass('lucide-inbox')
  })
})

describe('ErrorState', () => {
  it('shows no retry without an onRetry', () => {
    renderWithProviders(<ErrorState error={new Error('boom')} />)
    expect(screen.getByText('boom')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('shows no message when the error is not an Error', () => {
    renderWithProviders(<ErrorState error="boom" onRetry={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar')
    expect(screen.queryByText('boom')).toBeNull()
  })

  // an ApiError's message is the status text when the body has none, and that is '' over HTTP/2
  it('draws no message line for an Error with an empty message', () => {
    renderWithProviders(<ErrorState error={new ApiError(500, '')} onRetry={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No se pudo cargar')
    expect(alert.querySelectorAll('p')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

// data-slot: hook a theme sheet styles; data-state tells the three apart
describe('markup hooks', () => {
  it('marks the root of each state with data-slot and data-state', () => {
    const loading = renderWithProviders(<LoadingState />)
    expect(screen.getByRole('status')).toHaveAttribute('data-slot', 'query-state')
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'loading')
    loading.unmount()

    const empty = renderWithProviders(<EmptyState title="Sin predios" />)
    expect(empty.container.firstElementChild).toHaveAttribute('data-slot', 'query-state')
    expect(empty.container.firstElementChild).toHaveAttribute('data-state', 'empty')
    empty.unmount()

    renderWithProviders(<ErrorState error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'query-state')
    expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'error')
  })

  it('marks the states QueryState renders', () => {
    renderWithProviders(<QueryState query={fakeQuery({ isPending: true })}>{() => null}</QueryState>)
    expect(screen.getByRole('status')).toHaveAttribute('data-slot', 'query-state')
  })
})

// an app wraps the states (its own empty list, a query of two queries): the prop types come from the package
describe('the prop types', () => {
  it('are exported, and are what the states take', () => {
    expectTypeOf<LoadingStateProps>().toEqualTypeOf<Parameters<typeof LoadingState>[0]>()
    expectTypeOf<EmptyStateProps>().toEqualTypeOf<Parameters<typeof EmptyState>[0]>()
    expectTypeOf<ErrorStateProps>().toEqualTypeOf<Parameters<typeof ErrorState>[0]>()
    expectTypeOf<QueryStateProps<string>>().toEqualTypeOf<Parameters<typeof QueryState<string>>[0]>()
    expectTypeOf<QueryStateProps<string>['children']>().toEqualTypeOf<(data: string) => ReactNode>()
  })
})

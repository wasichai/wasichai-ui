import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { WasichaiModule } from '../registry/contract'
import type { RecordPayload } from '../types/metadata'
import { useDeleteField, useResolvedPage, useSaveRecord } from './index'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

const sketches: WasichaiModule = { id: 'sketch', recordQueryKeys: (object) => [['sketch-tiles', object]] }

function Save({ payload }: { payload: RecordPayload }) {
  const save = useSaveRecord('predio')
  return <button onClick={() => save.mutate(payload)}>{save.isSuccess ? 'saved' : 'save'}</button>
}

function DropField() {
  const drop = useDeleteField('predio')
  return <button onClick={() => drop.mutate('area')}>{drop.isSuccess ? 'dropped' : 'drop'}</button>
}

function PageName() {
  const page = useResolvedPage('predio')
  return <p>{page.data?.name ?? '…'}</p>
}

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
}

describe('record queries', () => {
  it('posts the payload as it is, sections included', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }])
    renderWithProviders(<Save payload={{ attributes: { codigo: 'A' }, sketches: {} }} />, { modules: [sketches] })

    await userEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saved')
    expect(fetch.calls[0].body).toEqual({ attributes: { codigo: 'A' }, sketches: {} })
  })

  it('makes what modules cache about the object stale after a save', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }])
    const { queryClient } = renderWithProviders(<Save payload={{ attributes: {} }} />, { modules: [sketches] })
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'save' }))

    await waitFor(() => expect(invalidatedKeys(spy)).toContainEqual(['sketch-tiles', 'predio']))
    expect(invalidatedKeys(spy)).toContainEqual(['records', 'predio'])
    expect(invalidatedKeys(spy)).toContainEqual(['related'])
  })

  it('invalidates only core keys when no module caches anything', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }])
    const { queryClient } = renderWithProviders(<Save payload={{ attributes: {} }} />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saved')
    expect(invalidatedKeys(spy)).toEqual([['records', 'predio'], ['related']])
  })
})

describe('field queries', () => {
  it('drops the object, its records and module caches after a field delete', async () => {
    fetch = mockFetch([{ method: 'DELETE', path: '/metadata/objects/predio/fields/area', status: 204 }])
    const { queryClient } = renderWithProviders(<DropField />, { modules: [sketches] })
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'drop' }))

    await screen.findByText('dropped')
    expect(invalidatedKeys(spy)).toEqual([
      ['objects', 'predio'],
      ['records', 'predio'],
      ['sketch-tiles', 'predio']
    ])
  })
})

describe('page queries', () => {
  it('asks for the resolved record detail page', async () => {
    fetch = mockFetch([{ path: '/objects/predio/pages/record-detail', body: { name: 'predio_record_detail' } }])
    renderWithProviders(<PageName />)
    expect(await screen.findByText('predio_record_detail')).toBeInTheDocument()
  })
})

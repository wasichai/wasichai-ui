import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { WasichaiModule } from '../registry/contract'
import {
  useCreateObjectAction,
  useDeleteField,
  useDeleteObjectAction,
  useDeleteRecord,
  useLinkRelated,
  useResolvedPage,
  useSaveRecord,
  type SaveRecordInput
} from './index'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

const sketches: WasichaiModule = { id: 'sketch', recordQueryKeys: (object) => [['sketch-tiles', object]] }

function Save({ payload }: { payload: SaveRecordInput }) {
  const save = useSaveRecord('predio')
  return <button onClick={() => save.mutate(payload)}>{save.isSuccess ? 'saved' : 'save'}</button>
}

function Delete({ reason }: { reason?: string }) {
  const remove = useDeleteRecord('predio')
  return <button onClick={() => remove.mutate(reason ? { id: 'r1', reason } : 'r1')}>{remove.isSuccess ? 'deleted' : 'delete'}</button>
}

function LinksWithReason() {
  const { link, unlink } = useLinkRelated('predio', 'r1', 'duenos')
  return (
    <>
      <button onClick={() => link.mutate({ otherId: 'p1', reason: 'vínculo' })}>{link.isSuccess ? 'linked' : 'link'}</button>
      <button onClick={() => unlink.mutate({ otherId: 'p1', reason: 'baja' })}>{unlink.isSuccess ? 'unlinked' : 'unlink'}</button>
    </>
  )
}

function SaveExisting() {
  const save = useSaveRecord('predio', 'r1')
  return <button onClick={() => save.mutate({ attributes: {} })}>{save.isSuccess ? 'saved' : 'save'}</button>
}

function Links() {
  const { link, unlink } = useLinkRelated('predio', 'r1', 'duenos')
  return (
    <>
      <button onClick={() => link.mutate('p1')}>{link.isSuccess ? 'linked' : 'link'}</button>
      <button onClick={() => unlink.mutate('p1')}>{unlink.isSuccess ? 'unlinked' : 'unlink'}</button>
    </>
  )
}

function DropField() {
  const drop = useDeleteField('predio')
  return <button onClick={() => drop.mutate('area')}>{drop.isSuccess ? 'dropped' : 'drop'}</button>
}

function Actions({ label }: { label: string }) {
  const create = useCreateObjectAction('predio')
  const remove = useDeleteObjectAction('predio')
  return (
    <>
      <button onClick={() => create.mutate({ name: 'anular', label })}>{create.isSuccess ? 'declared' : 'declare'}</button>
      <button onClick={() => remove.mutate('ANULAR')}>{remove.isSuccess ? 'removed' : 'remove'}</button>
    </>
  )
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
    // find, not [0]: ThemeProvider's own preferences GET also lands in fetch.calls
    expect(fetch.calls.find((call) => call.method === 'POST')?.body).toEqual({ attributes: { codigo: 'A' }, sketches: {} })
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

  // the update is an entry of the record's history, already open on the same page
  it('refreshes the history of the record it saved', async () => {
    fetch = mockFetch([{ method: 'PUT', path: '/objects/predio/records/r1', body: { id: 'r1' } }])
    const { queryClient } = renderWithProviders(<SaveExisting />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saved')
    expect(invalidatedKeys(spy)).toContainEqual(['record', 'predio', 'r1'])
    expect(invalidatedKeys(spy)).toContainEqual(['history', 'predio', 'r1'])
  })

  // a link writes an UPDATE on both records (ADR-031 D9); the other one is not known here
  it('refreshes every history after a link and an unlink', async () => {
    fetch = mockFetch([
      { method: 'POST', path: '/objects/predio/records/r1/related/duenos', status: 204 },
      { method: 'DELETE', path: '/objects/predio/records/r1/related/duenos/p1', status: 204 }
    ])
    const { queryClient } = renderWithProviders(<Links />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'link' }))
    await screen.findByText('linked')
    expect(invalidatedKeys(spy)).toContainEqual(['history'])

    spy.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'unlink' }))
    await screen.findByText('unlinked')
    expect(invalidatedKeys(spy)).toContainEqual(['history'])
  })
})

describe('record writes with a change reason', () => {
  const writeCall = (mock: FetchMock, method: string) => mock.calls.find((call) => call.method === method)

  it('still posts a bare payload, with no reason header', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }])
    renderWithProviders(<Save payload={{ attributes: { codigo: 'A' } }} />)

    await userEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saved')
    expect(writeCall(fetch, 'POST')?.body).toEqual({ attributes: { codigo: 'A' } })
    expect(writeCall(fetch, 'POST')?.headers['x-change-reason']).toBeUndefined()
  })

  it('sends the reason as X-Change-Reason beside the payload', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }])
    renderWithProviders(<Save payload={{ payload: { attributes: { codigo: 'A' } }, reason: 'alta' }} />)

    await userEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saved')
    // the reason never travels in the body
    expect(writeCall(fetch, 'POST')?.body).toEqual({ attributes: { codigo: 'A' } })
    expect(writeCall(fetch, 'POST')?.headers['x-change-reason']).toBe("UTF-8''alta")
  })

  it('deletes with a reason', async () => {
    fetch = mockFetch([{ method: 'DELETE', path: '/objects/predio/records/r1', status: 204 }])
    renderWithProviders(<Delete reason="duplicado" />)

    await userEvent.click(screen.getByRole('button', { name: 'delete' }))

    await screen.findByText('deleted')
    expect(writeCall(fetch, 'DELETE')?.path).toBe('/objects/predio/records/r1')
    expect(writeCall(fetch, 'DELETE')?.headers['x-change-reason']).toBe("UTF-8''duplicado")
  })

  it('still deletes by id alone, with no reason header', async () => {
    fetch = mockFetch([{ method: 'DELETE', path: '/objects/predio/records/r1', status: 204 }])
    renderWithProviders(<Delete />)

    await userEvent.click(screen.getByRole('button', { name: 'delete' }))

    await screen.findByText('deleted')
    expect(writeCall(fetch, 'DELETE')?.path).toBe('/objects/predio/records/r1')
    expect(writeCall(fetch, 'DELETE')?.headers['x-change-reason']).toBeUndefined()
  })

  it('links and unlinks with a reason', async () => {
    fetch = mockFetch([
      { method: 'POST', path: '/objects/predio/records/r1/related/duenos', status: 204 },
      { method: 'DELETE', path: '/objects/predio/records/r1/related/duenos/p1', status: 204 }
    ])
    renderWithProviders(<LinksWithReason />)

    await userEvent.click(screen.getByRole('button', { name: 'link' }))
    await screen.findByText('linked')
    expect(writeCall(fetch, 'POST')?.body).toEqual({ otherId: 'p1' })
    expect(writeCall(fetch, 'POST')?.headers['x-change-reason']).toBe("UTF-8''v%C3%ADnculo")

    await userEvent.click(screen.getByRole('button', { name: 'unlink' }))
    await screen.findByText('unlinked')
    expect(writeCall(fetch, 'DELETE')?.path).toBe('/objects/predio/records/r1/related/duenos/p1')
    expect(writeCall(fetch, 'DELETE')?.headers['x-change-reason']).toBe("UTF-8''baja")
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

describe('declared action queries', () => {
  it('declares an action and refreshes the list', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/metadata/objects/predio/actions', status: 201, body: { name: 'ANULAR', label: 'Anular' } }])
    const { queryClient } = renderWithProviders(<Actions label=" Anular " />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'declare' }))

    await screen.findByText('declared')
    expect(fetch.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'ANULAR', label: 'Anular' })
    expect(invalidatedKeys(spy)).toContainEqual(['objects', 'predio', 'actions'])
  })

  // the server defaults a missing label to the name; an empty one would be stored empty
  it('leaves a blank label out', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/metadata/objects/predio/actions', status: 201, body: { name: 'ANULAR', label: 'ANULAR' } }])
    renderWithProviders(<Actions label="  " />)

    await userEvent.click(screen.getByRole('button', { name: 'declare' }))

    await screen.findByText('declared')
    expect(fetch.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'ANULAR' })
  })

  // its grants go with it, so every cached role is stale
  it('removes an action and the roles that granted it go stale', async () => {
    fetch = mockFetch([{ method: 'DELETE', path: '/metadata/objects/predio/actions/ANULAR', status: 204 }])
    const { queryClient } = renderWithProviders(<Actions label="" />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'remove' }))

    await screen.findByText('removed')
    expect(fetch.calls.find((call) => call.method === 'DELETE')?.path).toBe('/metadata/objects/predio/actions/ANULAR')
    expect(invalidatedKeys(spy)).toContainEqual(['objects', 'predio', 'actions'])
    expect(invalidatedKeys(spy)).toContainEqual(['admin', 'roles'])
  })
})

describe('page queries', () => {
  it('asks for the resolved record detail page', async () => {
    fetch = mockFetch([{ path: '/objects/predio/pages/record-detail', body: { name: 'predio_record_detail' } }])
    renderWithProviders(<PageName />)
    expect(await screen.findByText('predio_record_detail')).toBeInTheDocument()
  })
})

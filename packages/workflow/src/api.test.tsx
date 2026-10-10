import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { useApplyTransition, useDeleteWorkflow } from './api'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('useDeleteWorkflow', () => {
  // invalidateQueries alone would leave the deleted workflow's data in the cache (marked stale)
  // until the background 404 refetch lands -- a flag or a picker reading it synchronously in
  // between still sees the deleted workflow. removeQueries drops the entry itself, so nobody does.
  it('removes the cached workflow instead of only invalidating it', async () => {
    fetch = mockFetch([{ method: 'DELETE', path: '/objects/predio/workflow', status: 204 }])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const remove = vi.spyOn(queryClient, 'removeQueries')

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper: Wrapper })
    await result.current.mutateAsync('predio')

    await waitFor(() => expect(remove).toHaveBeenCalledWith({ queryKey: ['workflow', 'predio'] }))
  })
})

describe('useApplyTransition', () => {
  it('applies a transition with the change reason', async () => {
    const path = '/objects/predio/records/r1/transitions/aprobar'
    fetch = mockFetch([{ method: 'POST', path, body: { id: 'r1', createdAt: null, updatedAt: null, attributes: {}, state: 'approved' } }])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useApplyTransition('predio', 'r1'), { wrapper: Wrapper })
    await result.current.mutateAsync({ name: 'aprobar', reason: 'revisado' })
    // the old call shape still works, and sends no reason
    await result.current.mutateAsync('aprobar')

    const posts = fetch.calls.filter((call) => call.method === 'POST')
    expect(posts.map((call) => call.path)).toEqual([path, path])
    expect(posts[0].headers['x-change-reason']).toBe("UTF-8''revisado")
    expect(posts[1].headers['x-change-reason']).toBeUndefined()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { useDeleteWorkflow } from './api'

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

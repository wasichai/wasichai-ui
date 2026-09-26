import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { useIssueDocument } from './api'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('useIssueDocument', () => {
  // core's RecordHistory reads ['history', objectName, recordId, limit] (core/src/features/history/api.ts) --
  // invalidating the ['history', objectName, recordId] prefix covers every limit, so the new ISSUE row
  // shows up in the timeline without a manual refresh. the original app never invalidated it; this closes that gap.
  it('invalidates the record documents list and core’s history query on success', async () => {
    fetch = mockFetch([{ method: 'POST', path: '/objects/predio/records/record-1/documents/certificado', body: { id: 'document-1' } }])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useIssueDocument('predio', 'record-1'), { wrapper: Wrapper })
    await result.current.mutateAsync('certificado')

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['documents', 'predio', 'record-1'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['history', 'predio', 'record-1'] })
    })
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { useApplyTransition, useAvailableTransitions, useDeleteWorkflow } from './api'

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

describe('useAvailableTransitions', () => {
  const path = '/objects/predio/records/r1/transitions'
  const answer = [
    {
      name: 'approve',
      label: 'Aprobar',
      to: 'approved',
      toLabel: 'Aprobado',
      allowed: true,
      reason: null,
      labels: { en: 'Approve' },
      toLabels: { en: 'Approved' }
    },
    // a server from before ADR-070 sends no maps
    { name: 'reject', label: 'Rechazar', to: 'draft', toLabel: 'Borrador', allowed: true, reason: null }
  ]

  async function transitionsIn(language: string) {
    fetch = mockFetch([{ path, body: answer }])
    const i18n = createInstance()
    await i18n.use(initReactI18next).init({ lng: language, resources: {} })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </I18nextProvider>
      )
    }
    const { result } = renderHook(() => useAvailableTransitions('predio', 'r1'), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    return result.current.data!
  }

  it('hands out the labels of the active language', async () => {
    const [approve, reject] = await transitionsIn('en')
    expect(approve).toMatchObject({ label: 'Approve', toLabel: 'Approved' })
    expect(reject).toMatchObject({ label: 'Rechazar', toLabel: 'Borrador' })
  })

  it('keeps the plain labels for a language the maps lack', async () => {
    const [approve] = await transitionsIn('es')
    expect(approve).toMatchObject({ label: 'Aprobar', toLabel: 'Aprobado' })
  })
})

import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { createApiClient, getActiveApiClient } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { createWasichaiI18n } from '../i18n/createI18n'
import type { WasichaiModule } from '../registry/contract'
import { createRegistry } from '../registry/createRegistry'
import { useObjectFlags } from '../registry/hooks'
import { WasichaiProviders } from './WasichaiProviders'
import { resolveConfig } from './config'
import { useWasichaiLinks, useRegistry } from './context'

function mount(modules: WasichaiModule[], children: ReactNode) {
  const config = resolveConfig({ storagePrefix: 'providers-test' })
  const apiClient = createApiClient({ baseUrl: '/custom', storagePrefix: config.storagePrefix })
  const registry = createRegistry(modules)
  const i18n = createWasichaiI18n({ languages: config.languages, storageKey: apiClient.keys.lang, modules })
  const view = render(
    <WasichaiProviders
      config={config}
      registry={registry}
      apiClient={apiClient}
      i18n={i18n}
      queryClient={new QueryClient()}
      initialUser={null}
      initialPermissions={null}
    >
      {children}
    </WasichaiProviders>
  )
  return { ...view, apiClient }
}

function Outer({ children }: { children: ReactNode }) {
  return <section data-testid="outer">{children}</section>
}

function Inner({ children }: { children: ReactNode }) {
  return <article data-testid="inner">{children}</article>
}

describe('WasichaiProviders', () => {
  it('wraps the app in module providers, first module outermost', () => {
    mount(
      [
        { id: 'a', providers: [Outer] },
        { id: 'b', providers: [Inner] }
      ],
      <p>app</p>
    )
    expect(screen.getByTestId('outer')).toContainElement(screen.getByTestId('inner'))
    expect(screen.getByTestId('inner')).toHaveTextContent('app')
  })

  it('makes its api client the one plain api() calls use', () => {
    const { apiClient } = mount([], <p>app</p>)
    expect(getActiveApiClient()).toBe(apiClient)
  })

  it('hands the registry and links to any screen below it', () => {
    function Screen() {
      const links = useWasichaiLinks()
      return <p>{`${useRegistry().modules.length} ${links.records('predio')}`}</p>
    }
    mount([{ id: 'a' }], <Screen />)
    expect(screen.getByText('1 /data/objects/predio/records')).toBeInTheDocument()
  })

  it('merges what every module knows about an object', () => {
    function Flags() {
      return <p>{JSON.stringify(useObjectFlags('predio'))}</p>
    }
    mount(
      [
        { id: 'a', objectFlags: (object) => ({ workflow: object === 'predio' }) },
        { id: 'b', objectFlags: () => ({ spatial: false }) }
      ],
      <Flags />
    )
    expect(screen.getByText('{"workflow":true,"spatial":false}')).toBeInTheDocument()
  })

  it('says where wasichai hooks belong when used outside', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Screen() {
      useRegistry()
      return null
    }
    expect(() => render(<Screen />)).toThrow(/inside WasichaiApp/)
  })
})

// without a user given, the sign-in mode comes from the backend before anything signs in
describe('WasichaiProviders and /auth/config', () => {
  function Mode() {
    return <p>{`mode ${useAuth().mode}`}</p>
  }

  function boot() {
    const config = resolveConfig({ storagePrefix: 'providers-config-test' })
    const apiClient = createApiClient({ baseUrl: config.apiBaseUrl, storagePrefix: config.storagePrefix })
    const i18n = createWasichaiI18n({ languages: config.languages, storageKey: apiClient.keys.lang, modules: [] })
    return render(
      <WasichaiProviders config={config} registry={createRegistry([])} apiClient={apiClient} i18n={i18n} queryClient={new QueryClient()}>
        <Mode />
      </WasichaiProviders>
    )
  }

  let fetch: FetchMock | null = null
  afterEach(() => {
    fetch?.restore()
    vi.unstubAllGlobals()
  })

  it('reads local from an older backend without the route', async () => {
    fetch = mockFetch([])
    boot()
    expect(await screen.findByText('mode local')).toBeInTheDocument()
  })

  it('shows loading, then an error with Reintentar, never a sign-in of the wrong mode', async () => {
    let answer: () => Response = () => new Response('<html>bad gateway</html>', { status: 502 })
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await gate
        return answer()
      })
    )
    boot()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(screen.queryByText(/^mode/)).toBeNull()
    release()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/^mode/)).toBeNull()

    answer = () => new Response(JSON.stringify({ mode: 'local' }), { status: 200 })
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('mode local')).toBeInTheDocument()
  })
})

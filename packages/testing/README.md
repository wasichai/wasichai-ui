# @wasichai/testing

Module guide: [docs/modules/testing.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/testing.md).

Test helpers for apps and modules built on `@wasichai/core`. Framework-agnostic (no vitest import),
used with vitest + jsdom + Testing Library.

Peer dependencies: `@wasichai/core`, `@tanstack/react-query`, `@testing-library/react`, `react`,
`react-dom`, `react-router`.

## renderWithProviders

Mounts the same providers `WasichaiApp` does (registry, api client, i18n, react-query, auth) around
a `MemoryRouter`. Defaults: signed in as `TEST_USER` with admin `TEST_PERMISSIONS`, spanish,
`coreModule` alone, storage prefix `wasichai-test`.

`coreModule` is registered automatically, the same way `WasichaiApp` registers it, so every module's
tests get core's routes and nav groups (`data`, `builder`, `automation`, `administration`) without
naming it. Passing it explicitly in `modules` is still fine, it is only prepended when missing, so a
leftover `coreModule` from before this change does not register it twice.

```tsx
import { renderWithProviders } from '@wasichai/testing'
import { myModule } from './module'

renderWithProviders(<MyScreen />, {
  modules: [myModule], // coreModule is added for you
  route: '/data/objects/predio/edit',
  path: 'data/objects/:object/edit', // so useParams() resolves
  user: null, // signed out
  language: 'en'
})
```

## mockFetch

```ts
const fetch = mockFetch([
  { path: '/objects', body: [] },
  { method: 'POST', path: '/objects/predio/records', status: 201, body: { id: 'r1' } }
])
// ... render, interact ...
expect(fetch.calls.map((call) => call.path)).toContain('/objects')
fetch.restore()
```

Paths are matched after the api base url (`/api` unless `mockFetch(routes, { baseUrl })`). Anything
unmatched answers `404` with a problem body naming the request.

## Cleanup between tests

Consumers must run Testing Library's cleanup between tests: `renderWithProviders` mounts a real
`AuthProvider`, and unmounting the previous test's tree (not just rendering a new one) is what runs
its effect cleanup, which clears `onUnauthorized` on the api client. Without it, an api client from an
earlier test can still be wired to a stale `signOut` when a later test's assertions run, and the DOM
carries over between tests too. Do it either of these ways:

- vitest `test.globals: true`, which turns on Testing Library's own auto-cleanup `afterEach`; or
- call `afterEach(cleanup)` yourself in a setup file.

```ts
// vitest.config.ts
export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' }
})
```

```ts
// src/test/setup.ts, only needed when globals is false
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
```

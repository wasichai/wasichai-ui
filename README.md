# wasichai-ui

The React packages of [wasichai](https://github.com/wasichai/wasichai), a metadata-driven application platform built
as libraries: the app shell, one package per backend module, UI primitives and test helpers, published as
`@wasichai/*` to GitHub Packages. The backend, every ADR and the module docs live in
[wasichai/wasichai](https://github.com/wasichai/wasichai).

```tsx
import { WasichaiApp } from '@wasichai/core'
import { documentsModule } from '@wasichai/documents'

<WasichaiApp config={{ apiBaseUrl: '/api' }} modules={[documentsModule()]} />
```

| Package | What |
|---|---|
| `@wasichai/ui` | primitives and the Tailwind theme |
| `@wasichai/core` | the app shell, module registry, api client, auth, i18n and every screen that needs no module |
| `@wasichai/{views,forms,pages,workflow,automation,documents,gis,agent}` | one package per backend module |
| `@wasichai/testing` | render helpers and fetch mocks for tests |

Install (`.npmrc`: `@wasichai:registry=https://npm.pkg.github.com` plus a token with `read:packages`):
`yarn add @wasichai/core @wasichai/ui`. Step by step:
[build your app](https://github.com/wasichai/wasichai/blob/main/docs/guides/build-your-app.md).

## Layout

```
packages/   @wasichai/* (ui, core, testing, one per module; smoke is private)
tooling/    release and scaffolding scripts (check-release, set-version, run-ordered, scaffold-module)
docs/       frontend development guide
```

## Dev pre-releases

`dev` is a clone of `main` that never merges back. To try a change before release-please ships it, run the *Release dev*
workflow (Actions tab) on `dev`: it publishes every public package as `X.Y.0-dev.N` (the next minor of the manifest plus
a counter: `0.3.1` gives `0.4.0-dev.0`) under the npm dist-tag `dev`, then tags a GitHub prerelease. `latest` never
moves.

A consumer pins the exact version; a range would not match a pre-release of another minor:

```bash
yarn add -E @wasichai/core@0.4.0-dev.0 @wasichai/ui@0.4.0-dev.0
npm view @wasichai/ui dist-tags
```

## Commands

```bash
yarn install && yarn lint && yarn test && yarn build
yarn test:tooling
```

Development and releasing: [docs/README.md](docs/README.md). Sample apps, each a repository with its server and
its web: [simple-sample](https://github.com/wasichai/simple-sample),
[documents-sample](https://github.com/wasichai/documents-sample), [gis-sample](https://github.com/wasichai/gis-sample)
and [full-sample](https://github.com/wasichai/full-sample).
Origin: [wasichai was chawpi until 2026-09-26](https://github.com/wasichai/wasichai/blob/main/docs/chawpi-origin.md).

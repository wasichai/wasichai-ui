# Frontend development

The React side of [wasichai](https://github.com/wasichai/wasichai). Architecture, modules, API and decisions are
documented there; this page covers working in this repository.

## Read first (in wasichai)

- [Architecture overview](https://github.com/wasichai/wasichai/blob/main/docs/architecture/overview.md)
- [Modules](https://github.com/wasichai/wasichai/blob/main/docs/modules/README.md) (one page each, frontend part included) ·
  [Build your app](https://github.com/wasichai/wasichai/blob/main/docs/guides/build-your-app.md) ·
  [REST API](https://github.com/wasichai/wasichai/blob/main/docs/api/rest.md)
- ADRs: [ADR-028 Frontend modules plug into a registry](https://github.com/wasichai/wasichai/blob/main/docs/adr/0028-frontend-module-registry.md),
  [ADR-029 publishing](https://github.com/wasichai/wasichai/blob/main/docs/adr/0029-polyglot-monorepo-and-publishing.md),
  [ADR-031 deviations](https://github.com/wasichai/wasichai/blob/main/docs/adr/0031-deliberate-deviations-from-sapgis.md),
  [ADR-032 rebrand and repository split](https://github.com/wasichai/wasichai/blob/main/docs/adr/0032-rebrand-to-wasichai-and-split-repositories.md),
  [all ADRs](https://github.com/wasichai/wasichai/blob/main/docs/adr/README.md)

## Requirements and layout

Node 26, Yarn 1. `packages/*` are the yarn workspaces. `tooling/` holds `run-ordered.mjs`
(builds packages in dependency order), `check-release.mjs`, `set-version.mjs` and `scaffold-module.mjs`.

## Commands

```bash
yarn install
yarn format:check && yarn lint   # prettier + tsc per workspace
yarn test                        # vitest in every package
yarn test:tooling                # node --test tooling/*.test.mjs
yarn build                       # every package, in dependency order
```

## Samples

The sample apps are repositories of their own, each with its server and its web:
[simple-sample](https://github.com/wasichai/simple-sample), [documents-sample](https://github.com/wasichai/documents-sample),
[gis-sample](https://github.com/wasichai/gis-sample) and [full-sample](https://github.com/wasichai/full-sample)
(which also runs the Playwright e2e). Their webs depend on the published `@wasichai/*` packages. With this
repository checked out next to one, `yarn build` here and `yarn link:local` in the sample's `web/` link these
packages instead, and the sample's `yarn test` runs against these sources directly. A change to a package is
released before a sample's CI sees it.

## Releasing

release-please (`node`) bumps the root `package.json` and every public `packages/*/package.json` together and writes
`CHANGELOG.md`; merging its PR tags `vX.Y.Z`, and the release runs `publish.yml`: `check-release.mjs --pack` (exactly
the eleven public `@wasichai/*` packages, internal ranges pinned, entry points in every tarball), then
`set-version.mjs` and `npm publish` to `https://npm.pkg.github.com`. The version is independent of the Maven
libraries' (ADR-032). The first release, v0.1.0, was pinned with `"release-as"`; to pin another one, add it back.

One-time repository secrets (Settings → Secrets and variables → Actions):

| Secret | Needed for | Fine-grained PAT |
|---|---|---|
| `RELEASE_PLEASE_TOKEN` | a release that runs `publish.yml` (one made with `GITHUB_TOKEN` runs nothing) | on this repo: Contents and Pull requests read/write |

**After the first publish (once per package):** Organization → Packages → each `@wasichai/*` package → Package
settings → "Manage Actions access" → add `simple-sample`, `documents-sample`, `gis-sample` and `full-sample` with
the Read role. The alternative is a `WASICHAI_PACKAGES_TOKEN` secret, a classic PAT with `read:packages`, in each
sample repository. The organization must allow members' workflows to publish packages (Organization settings →
Packages).

Consumers: `.npmrc` with `@wasichai:registry=https://npm.pkg.github.com` and `//npm.pkg.github.com/:_authToken=<PAT
with read:packages>`.

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

## Signing in

The backend decides the mode: `@wasichai/core` asks `GET /api/auth/config` at start and the app has nothing to configure.
The call is anonymous (a stored token is never sent).

- `local` keeps the email and password login. An older backend without the route (404, or 401 where it is not public)
  is treated as `local`.
- `oidc` signs people in through the domain's Keycloak realm (Authorization Code + PKCE, scope `openid organization`).

An app that mounts `WasichaiProviders` without `initialUser` or `authConfig` now issues that request before rendering.
Test suites with strict fetch or MSW mocks need a handler for it, answering `{"mode":"local"}`.

In `oidc`, the realm's client for the app needs, with `<origin><basename>` the app's root:

- the redirect URI `<origin><basename>/auth/callback`;
- the post-logout redirect URI `<origin><basename>/`;
- the web origin `<origin>`.

The wasichai platform creates them for its apps (`https://<host>/auth/callback`, `https://<host>/`, `https://<host>`);
an app outside the platform registers them itself.

«Cerrar sesión» ends the realm session (RP-initiated), and so the session of every app of the domain. An expired
session (a refresh the realm refuses, or a final 401) ends only the tab's: the login page shows, and «Ingresar» comes
back without a password while the realm session is alive. A refresh that fails on the network does not end it.

The session lives per tab in `sessionStorage`; switching to `oidc` clears the token and user that `local` left in
`localStorage`. The access token is renewed before it expires through one shared refresh; a 401 gets one refresh and
one retry before signing out. A person signed in to the realm but not invited to the app sees a full-page "no access"
screen with the reason from the backend.

The users screen in `oidc` has no passwords, shows a «Vinculado»/«Pendiente» column, and offers «Desvincular» for an
account that was recreated in Keycloak.

Decisions: wasichai's ADR-084 and `docs/security/authentication.md`.

## Layout

```
packages/   @wasichai/* (ui, core, testing, one per module; smoke is private)
tooling/    release and scaffolding scripts (check-release, set-version, publish-packages, dev-release, run-ordered,
            scaffold-module)
docs/       frontend development guide
```

## Dev pre-releases

`dev` is a clone of `main` that never merges back. A dev build publishes every public package as `X.Y.0-dev.N` (the
next minor of the manifest plus a counter: `0.3.1` gives `0.4.0-dev.0`) under the npm dist-tag `dev`; `latest` never
moves. Pushing a tag on a commit of `dev` starts it:

```bash
git fetch --tags && node tooling/dev-release.mjs next    # the version to tag, e.g. 0.4.0-dev.0
git tag v0.4.0-dev.0 <commit on dev> && git push origin v0.4.0-dev.0
```

The *Release dev* workflow refuses a tag that is not `vX.Y.Z-dev.N` and a commit that is not on `origin/dev`, runs the
release guard (`check-release.mjs --pack`), publishes with `publish-packages.mjs` and then creates a GitHub prerelease
for the tag. A publish that moves `latest` anyway gets it put back and stops the run.

A failed upload can leave some packages published and others not. Fix the cause (token, package access, registry) and
re-run the failed jobs of that tag's run: packages already published are skipped. A cause that needs a code change gets
a new commit and the next `N`; the incomplete `dev.N` is never used.

A consumer pins the exact version of every `@wasichai/*` package it uses, all on the same `dev.N`: published packages
depend on each other at their exact version, so a range could mix two `N`s and install two copies of core or ui.

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

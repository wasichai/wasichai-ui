# wasichai-ui — the React packages of wasichai

The frontend of a metadata-driven platform built as libraries. The backend, the docs and every ADR (frontend ones
included) are in the sibling repository `wasichai` (`../wasichai`): read its `docs/` before changing behaviour. The
sample apps are sibling repositories too (`../simple-sample`, `../documents-sample`, `../gis-sample`,
`../full-sample`); their webs link this repository's packages with `yarn link:local`.

## Non-negotiable stack

- React 19.3 (yarn 1 workspaces) + Vite 8 + Tailwind CSS 4 + shadcn-style components + i18next + react-router +
  react-query + zod; MapLibre GL JS in `@wasichai/gis`
- Node 26; vitest + testing-library
- Published as `@wasichai/*` to `npm.pkg.github.com`

## Architectural rules

1. **Metadata-driven**: never generate code per Custom Object. Screens read metadata from the API at runtime.
2. **Frontend modules register themselves** (`WasichaiModule`: routes, nav, field renderers, page components, slots,
   i18n) (ADR-028). No hardcoded routes or URLs outside the registry; links come from `useWasichaiLinks()`.
3. **A module package stays installable on its own**: it imports `@wasichai/core`, `@wasichai/ui` and its own
   libraries, never another module package or another module's heavy library (each package's `boundaries.test.ts`).
   Heavy libraries stay behind lazy routes.
4. **The REST API of wasichai is the contract** (ADR-032). A change that needs a new endpoint lands in wasichai first.
5. **Same behaviour as the original app**, except the entries of ADR-031.
6. **No overengineering**: an abstraction needs a concrete second user.

## Working rules

- **`.editorconfig` is law** (TS/JSON/YAML/MD 2 spaces where the file says so, max 160 columns, LF, final newline).
  Format before finishing: `yarn format`. Markdown is hand-formatted to the same rules.
- **Conventional Commits** for every commit and PR title (`feat(gis): …`, `fix(core): …`), enforced by commitlint.
- Code, identifiers and comments in **English**. Comments **caveman style**: short, say why.
- Decisions are ADRs in wasichai's `docs/adr/`; change history in wasichai's `docs/HISTORY.md`.

## Commands

```bash
yarn install && yarn lint && yarn test && yarn build
yarn test:tooling                                   # tooling/*.test.mjs
node tooling/check-release.mjs --pack 0.0.0-local   # what a release would publish
```

## Definition of Done

Works · has tests · handles errors · is documented · does not break existing features · lint, tests and build pass ·
modules stay independent · behaviour matches the original app or ADR-031 · formatted with `.editorconfig`.

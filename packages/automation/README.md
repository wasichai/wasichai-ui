# @wasichai/automation

Module guide: [docs/modules/automation.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/automation.md).

Automation rules for a wasichai app: "when something happens to a record, do something". A form-based rule
builder (trigger, conditions, actions) and the organisation-wide run log.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```bash
yarn add @wasichai/core @wasichai/ui @wasichai/automation
```

Peers: `@wasichai/core`, `@wasichai/ui`, `react`, `react-dom`, `@tanstack/react-query`, `i18next`, `react-i18next`, `react-router`.

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { automationModule } from '@wasichai/automation'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'My App' }} modules={[automationModule()]} />
}
```

## What it adds

| Slot | Value |
|---|---|
| routes | `automation:rules` → `/automation/rules` (rule builder), `automation:runs` → `/automation/runs` (run log); both lazy |
| nav | group `automation` (core's): "Reglas" (order 20), "Ejecuciones" (order 30) |
| i18n | namespace `automation` (es, en) |

It works with or without `@wasichai/workflow` and `@wasichai/documents`. It reads an object's workflow
(`GET /objects/{object}/workflow`) and its document types (`GET /objects/{object}/document-types`)
under the same query keys those modules use, so the cache is shared. When either module is absent,
its endpoint answers 404, and the state, transition and document-type pickers stay empty.

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'automation'` | url prefix of both routes |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

Needs the wasichai automation backend module: `/api/objects/{object}/automations` (GET/POST/PUT/DELETE),
`/api/objects/{object}/automations/{name}/runs` and `/api/automation-runs`. Endpoints of modules that
are not installed must answer 404 (not 403).

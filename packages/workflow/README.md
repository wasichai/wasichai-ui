# @wasichai/workflow

Module guide: [docs/modules/workflow.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/workflow.md).

Record workflows for a Wasichai app:
- a visual builder (states, transitions, roles) on an xyflow canvas;
- a WORKFLOW component that shows a record's state and its allowed transitions on the record page;
- a TRANSITION button kind for the page builder.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```bash
yarn add @wasichai/core @wasichai/ui @wasichai/workflow
```

`@xyflow/react` comes in as a dependency of this package. Its stylesheet is imported by the canvas, so a
bundler that handles CSS imports (Vite, webpack with css-loader) needs nothing else. The builder page is
loaded lazily by the `workflow:builder` route, not exported directly, so xyflow stays out of your first
bundle.

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { pagesModule } from '@wasichai/pages'
import { workflowModule } from '@wasichai/workflow'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'Catastro' }} modules={[pagesModule(), workflowModule()]} />
}
```

## What it adds

| Slot | Value |
|---|---|
| route `workflow:builder` | `/automation/workflows` (lazy) |
| nav | group `automation`, "Workflows" |
| page component `WORKFLOW` | the record's state and transition buttons; a state pill preview in the page builder |
| page action `TRANSITION` | a button that fires one named transition; the builder offers the object's workflow transitions, none while it is disabled |
| object flag `workflow` | `true` when the object has a workflow (core's object editor shows the state column's scope) |
| i18n namespace | `workflow` (es, en) |

With `@wasichai/pages` installed, a freshly dropped ACTION defaults to TRANSITION, as it did in the original
app. Without this module, the page builder offers NAVIGATE only, and a stored TRANSITION button draws nothing.

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'automation'` | url prefix of the builder route |

## Backend

It needs the wasichai workflow backend module. Paths are the backend's routes. The frontend reaches them through
`apiBaseUrl` (default `/api`), so a proxy that mounts the API elsewhere changes the prefix, not these paths.
- `GET|PUT|DELETE /objects/{object}/workflow`;
- `GET /objects/{object}/records/{id}/transitions`;
- `POST /objects/{object}/records/{id}/transitions/{name}`.

An object without a workflow, or a backend without the module, must answer **404**. The panel and the buttons then draw nothing, and nothing retries.

## Differs from the original app

Deleting a workflow drops its cached state and transitions immediately, instead of waiting for the
next fetch to notice it is gone.

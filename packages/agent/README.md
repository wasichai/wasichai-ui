# @wasichai/agent

Module guide: [docs/modules/agent.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/agent.md).

The assistant screen. Ask about your objects, records and geometries in plain language. The backend agent
answers as the signed-in user (it sees only what that user may see) and lists the tools it used on the way.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```
yarn add @wasichai/core @wasichai/ui @wasichai/agent
```

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { agentModule } from '@wasichai/agent'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'My App' }} modules={[agentModule()]} />
}
```

Tailwind: the app's stylesheet already has `@import "@wasichai/ui/theme.css"` and `@source
"../node_modules/@wasichai"` (see `@wasichai/ui`), which covers this package's classes too.

## What it adds

| Slot | Value |
|---|---|
| route `agent:assistant` | `/automation/assistant` → `AssistantPage` (lazy) |
| nav | "Asistente" / "Assistant" in core's automation group, order 40 |
| i18n | namespace `agent` (es, en) |

It also exports `useAgentStatus()` and `useAskAgent()`, for an app that wants to ask from its own screens.

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'automation'` | url prefix of the route: `agentModule({ basePath: 'ai' })` serves `/ai/assistant` |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

It needs the wasichai agent backend module (`GET /agent/status`, `POST /agent/ask` with `{ question }`). If the
status endpoint answers an error or `enabled: false`, the page says the assistant is not configured and blocks
the input. The rest of the app is unaffected.

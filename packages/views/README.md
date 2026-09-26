# @wasichai/views

Module guide: [docs/modules/views.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/views.md).

The list view builder: pick an object, then save list configurations for it (columns, filters, sort and page
size). Core's record list already reads stored views and falls back to a generated one, so this package only
adds the screen that edits them.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```
yarn add @wasichai/core @wasichai/ui @wasichai/views
```

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { viewsModule } from '@wasichai/views'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'My App' }} modules={[viewsModule()]} />
}
```

Tailwind: the app's stylesheet already has `@import "@wasichai/ui/theme.css"` and `@source
"../node_modules/@wasichai"` (see `@wasichai/ui`), which covers this package's classes too.

## What it adds

| Slot | Value |
|---|---|
| route `views:builder` | `/builder/views` → `ViewBuilderPage` (lazy) |
| nav | "Vistas" / "Views" in core's builder group, order 40 |
| i18n | namespace `views` (es, en) |

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'builder'` | url prefix of the route: `viewsModule({ basePath: 'config' })` serves `/config/views` |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

It needs the wasichai views backend module (`GET/POST /objects/{object}/views`, `PUT/DELETE
/objects/{object}/views/{name}`). Without it, the builder has nothing to edit, and core's record list keeps
working on its generated view. An absent backend module must answer 404.

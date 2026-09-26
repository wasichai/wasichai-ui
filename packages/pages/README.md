# @wasichai/pages

Module guide: [docs/modules/pages.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/pages.md).

Drag-and-drop builder for the record detail page of every object: a palette of components, a canvas laid out
by the page template, and an inspector for the selected component. Pages it saves are drawn by
`@wasichai/core`'s record detail page.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```bash
yarn add @wasichai/core @wasichai/ui @wasichai/pages
```

It brings `@dnd-kit/core`. It needs no other wasichai module.

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { pagesModule } from '@wasichai/pages'
import { gisModule } from '@wasichai/gis'
import { workflowModule } from '@wasichai/workflow'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'Catastro' }} modules={[pagesModule(), gisModule(), workflowModule()]} />
}
```

With gis and workflow installed, the palette also offers MAP and WORKFLOW, and an ACTION can be a TRANSITION.
Without them, the builder offers only core's components and NAVIGATE.

## What it adds

| Slot | Value |
|---|---|
| route `pages:builder` | `/builder/pages` (lazy) |
| nav | group `builder`, order 10, label `pages:nav.pages` |
| i18n namespace | `pages` |

## Module components and actions

The builder knows no module by name. It reads the registry. In the palette, module components are listed after
the core ones, in the order their modules were installed.

| Registry slot | Builder use |
|---|---|
| `pageComponents[type].labelKey`, `.icon` | palette entry (after core's content types, in module order) |
| `pageComponents[type].defaults` | merged over a freshly dropped node |
| `pageComponents[type].settings` | drawn in the inspector with `{ component, definition, objectName, onChange }` |
| `pageComponents[type].preview` | drawn on the canvas with `{ component, definition }`; absent = a labelled box |
| `pageActions[kind].labelKey` | ACTION kind picker (module kinds first, NAVIGATE last) |
| `pageActions[kind].defaults` | merged when a fresh ACTION takes that kind (the first listed kind is the default) |
| `pageActions[kind].settings` | drawn under the kind picker |

A stored page that uses a component or action whose module is not installed still opens. The node shows a labelled placeholder and is saved back untouched.

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `'builder'` | url prefix of the builder route |

## Backend

Paths are the backend's routes. The frontend reaches them through `apiBaseUrl` (default `/api`), so a proxy that
mounts the API elsewhere changes the prefix, not these paths.

It needs the wasichai `pages` backend module:
- `GET /api/objects/{object}/pages/record-detail` and `GET /api/metadata/page-templates`;
- `POST /api/pages` and `PUT`/`DELETE /api/pages/{name}`.

Without that module those endpoints must answer 404, and core's record page then falls back to the page it builds from metadata.

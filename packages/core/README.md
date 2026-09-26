# @wasichai/core

Module guide: [docs/modules/core.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/core.md).

The wasichai app in one component: shell, login, dashboard, objects, relationships, records, dynamic
forms, the record detail page renderer, history/audit and administration. Plus the module registry
that lets `@wasichai/gis`, `@wasichai/workflow`, `@wasichai/documents`, … plug in.

Peer dependencies: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `i18next`,
`react-i18next`. Styling: set up Tailwind as described in `@wasichai/ui`'s README.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```
yarn add @wasichai/core @wasichai/ui @wasichai/testing -D
```

`@wasichai/core` and `@wasichai/ui` are runtime dependencies of your app; `@wasichai/testing` is dev-only,
for tests. Your `tsconfig.json` needs `"moduleResolution": "bundler"`: these packages resolve through
their `package.json` `exports` map, which the older `node`/`classic` resolutions do not read.

## Quick start

```tsx
import { createRoot } from 'react-dom/client'
import { WasichaiApp } from '@wasichai/core'
import './index.css' // tailwind + @wasichai/ui/theme.css + @source, see @wasichai/ui

createRoot(document.getElementById('root')!).render(
  <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'Catastro', storagePrefix: 'catastro' }} modules={[]} />
)
```

| config | default | meaning |
|---|---|---|
| `apiBaseUrl` | `/api` | REST base url (trailing slash ignored) |
| `storagePrefix` | `wasichai` | localStorage keys `<prefix>.token/.user/.lang/.theme`; give each app on an origin its own |
| `languages` | `['es', 'en']` | first is default and fallback; the shell toggle cycles through them |
| `appName`, `appTagline` | the `app.name`/`app.tagline` strings | shell and login header |
| `basename` | – | router basename when not served from `/` |
| `defaultLoginEmail` | `''` | login form prefill (demo apps) |
| `themes` | – | extra `ThemeDefinition`s (`{ id, label, colorScheme }`); `light` and `dark` are always there |

Config and modules are read once, at mount. One `WasichaiApp` per page: plain `api()` calls use the
client of the mounted app.

## Full app

Assembling core, `@wasichai/ui` and all 8 optional modules into one app:

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { WasichaiApp } from '@wasichai/core'
import { agentModule } from '@wasichai/agent'
import { automationModule } from '@wasichai/automation'
import { documentsModule } from '@wasichai/documents'
import { formsModule } from '@wasichai/forms'
import { gisModule } from '@wasichai/gis'
import { pagesModule } from '@wasichai/pages'
import { viewsModule } from '@wasichai/views'
import { workflowModule } from '@wasichai/workflow'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@wasichai/documents/print.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <WasichaiApp
    config={{ apiBaseUrl: '/api', appName: 'Catastro', storagePrefix: 'catastro' }}
    modules={[
      gisModule({ workerUrl }),
      workflowModule(),
      pagesModule(),
      viewsModule(),
      formsModule(),
      documentsModule(),
      automationModule(),
      agentModule()
    ]}
  />
)
```

```css
/* src/index.css */
@import 'tailwindcss';
@import '@wasichai/ui/theme.css';
@source '../node_modules/@wasichai';
```

`@source` must see every `@wasichai/*` package's class names, ui's theme tokens and documents' print
sheet CSS are separate imports (not run through Tailwind, see their own READMEs), and the maplibre
worker/CSS setup is `@wasichai/gis`'s (see its README for the exact-version pin and bundler recipe).
Drop modules you do not need from both the `import` list and `modules={[...]}`; nothing else in the
snippet changes.

## Themes and preferences

The shell's theme selector offers `system` (follows the OS), `light`, `dark` and every `config.themes`
entry. An app theme is a `[data-theme='<id>']` block in your CSS that sets every token of
`@wasichai/ui/theme.css` (ADR-034). The pick is written to `<prefix>.theme` at once and, signed in,
saved for the user with `PUT /auth/me/preferences`; the language button does the same with the locale.
Against a backend without that endpoint (404) both stay in the browser.

| hook | gives |
|---|---|
| `useTheme()` | `preference`, the resolved `theme`, its `colorScheme` (`light`/`dark`, e.g. for a chart), `themes`, `setPreference(id)` |
| `usePreferences()` | the user's stored `{ theme, locale }`; `null` when the backend has no endpoint |
| `useUpdatePreferences()` | the mutation behind both: a partial `PUT`, optimistic, rolled back on failure |
| `useSetLocale()` | `(language) => Promise<void>`: switches the language now and stores it for the user |

To avoid a flash of the light theme before React mounts, copy the boot script from
[docs/modules/core.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/core.md) into `index.html`.

## Backend modules are optional

Core only needs the core backend. Without the pages module the record detail page is generated
from metadata (form, related lists, history); without the views module lists use every visible
field.

## Writing a module

A module is a plain object; every slot is optional.

```tsx
import type { WasichaiModule } from '@wasichai/core'

export function plansModule(): WasichaiModule {
  return {
    id: 'plans', // unique; also the i18n namespace and route-key prefix
    basePath: 'plans', // routes mount under /plans
    routes: [{ id: 'list', path: '', lazy: () => import('./PlansPage') }],
    navGroups: [{ id: 'plans', labelKey: 'plans:nav.group', order: 20 }],
    nav: [{ group: 'plans', labelKey: 'plans:nav.list', order: 10, route: 'list' }],
    i18n: { es: { nav: { group: 'Planos', list: 'Listado' } }, en: { nav: { group: 'Plans', list: 'List' } } }
  }
}
```

| slot | used for |
|---|---|
| `routes` | pages; `chrome`: `shell` (default), `bare` (signed in, no shell), `public` |
| `navGroups`, `nav` | sidebar; core declares `data` 10, `builder` 30, `automation` 40, `administration` 50 |
| `fieldRenderers` | new field types; values live in `record[section]`, the form sends them back there |
| `pageComponents`, `pageActions` | record-page component types and ACTION kinds |
| `recordPanels`, `recordListActions` | extra UI under a record page / in the record list header |
| `historyRenderers`, `auditValueFormatters`, `auditFieldLabels` | history entries and audit values |
| `dashboardCards`, `objectColumns`, `objectTileDetails` | dashboard and object list additions |
| `objectFlags`, `recordQueryKeys` | facts about an object; query keys to refresh after record writes |
| `providers`, `i18n` | app-wide wrappers; strings under the module's own namespace |

`createRegistry` validates the modules at startup and throws a `RegistryError` on a conflict:
- two modules claiming one type;
- a core type claimed;
- duplicate route paths;
- nav pointing at a missing route;
- two modules whose `fieldRenderers[*].settings.defaults` share a key (the object builder flattens
  every renderer's defaults into one map, so a shared key would silently override).

Links: `useWasichaiLinks()` gives `records(object)`, `record(object, id)`, … for core screens and
`to('plans:list')` / `has('plans:list')` for module routes.

## Adding a language / overriding strings

Every module ships `es` and `en` (core's own strings too). A module's `i18n` is just
`{ [language]: strings }`, keyed the same way `config.languages` is, so adding a language or
overriding a shipped string is spreading a new object over the module's `i18n` before it goes into
`modules`. Each module also exports its messages object (`gisMessages`, `pagesMessages`, …) for this:

```tsx
import { gisMessages, gisModule } from '@wasichai/gis'

const gis = { ...gisModule(), i18n: { ...gisMessages, pt: { nav: { gis: 'GIS', maps: 'Mapas' /* … */ } } } }

<WasichaiApp config={{ languages: ['es', 'en', 'pt'] }} modules={[gis]} />
```

List every language you ship, including the shipped ones, in `config.languages`: it is what
`createWasichaiI18n` reads to build the i18n resources and what the shell's language toggle cycles
through, not the union of what the modules happen to carry. Overriding one key of a shipped
language works the same way: spread `{ ...gisMessages, es: { ...gisMessages.es, map: { ...gisMessages.es.map, title: 'Mapa base' } } }`.

Testing: see `@wasichai/testing`.

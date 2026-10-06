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
| `themes` | – | extra `ThemeDefinition`s (`{ id, label, colorScheme }`); `light` and `dark` are always there, see [Themes](#themes-and-preferences) |

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

The library ships one optional theme, `portal-tributario` (light only). It is not built in: an app that
wants it imports its sheet and lists its definition, and the selector offers it. The tokens and the sheet
are described in `@wasichai/ui`'s README; the why is
[ADR-035](https://github.com/wasichai/wasichai/blob/main/docs/adr/0035-theme-extension-tokens-slots-and-optional-sheets.md).

```css
/* src/index.css */
@import 'tailwindcss';
@import '@wasichai/ui/theme.css';
@import '@wasichai/ui/themes/portal-tributario.css';
@source '../node_modules/@wasichai';
```

```ts
import { PORTAL_TRIBUTARIO_THEME } from '@wasichai/core'
// config: { themes: [PORTAL_TRIBUTARIO_THEME] }
```

To avoid a flash of the light theme before React mounts, put this boot script in `index.html`, before the
bundle. It lists every theme the app offers with its color scheme, so a stored app theme gets its
`colorScheme` before the bundle loads and an unknown id falls to the OS, as `resolveTheme` does. This one
is for an app with `portal-tributario`; put your own `config.themes` ids in `schemes`.

```html
<script>
  // before the bundle: apply the stored theme so a dark user never sees a light flash. `wasichai` = storagePrefix.
  // every theme the app offers, id -> color scheme: light, dark and each config.themes entry.
  // system and an unknown id (an old build, another app's theme) follow the os, as core's resolveTheme does
  try {
    const schemes = { light: 'light', dark: 'dark', 'portal-tributario': 'light' }
    const stored = localStorage.getItem('wasichai.theme')
    const dark = matchMedia('(prefers-color-scheme: dark)').matches
    const theme = stored && Object.hasOwn(schemes, stored) ? stored : dark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = schemes[theme]
  } catch {}
</script>
```

## Tree menu (`NavTree`)

A foldable tree menu for an app's own shell (srtm-ui's and caja-ui's portals): a panel headed by the way home and a
button that folds it, a bold title, groups and subgroups that fold, and leaves in the link colour, the current one
marked in bold with a chevron. A leaf at the root is drawn like a group, with its `icon` where a group has its caret;
an `external` leaf is a plain `<a>` to another app, never current.

```tsx
import { Settings } from 'lucide-react'
import { NavTree, type NavTreeNode } from '@wasichai/core'

const nodes: NavTreeNode[] = [
  { label: 'Contribuyentes', children: [{ label: 'Buscar contribuyentes', to: '/contribuyentes' }] },
  { label: 'Administración', to: '/admin', external: true, icon: Settings }
]

<NavTree id="sidebar" label="Secciones" title="Mis trámites" nodes={nodes} homeTo="/"
  open={open} groups={groups} onToggleGroup={toggle} onNavigate={foldOnPhone} onFold={() => setOpen(false)} />
```

The caller keeps the state: `open` hides the panel, and `groups` says which groups are folded, by their labels from the
root joined by `/` (`Tributos/Impuesto predial`); a group not in it is open. An app extends `NavTreeLeaf` with its own
fields, and the helpers keep that type: `navTreeLeaves(nodes)` lists the leaves, `currentNavTreeLeaf(nodes, pathname)`
gives the current one (its own route, else one whose `alsoAt` pattern matches, else the longest start of the path),
`isNavTreeGroup(node)` tells a group from a leaf. Its words are `common.goHome` and `common.hideMenu`. Its hooks
(`data-slot`): `nav-tree`, `nav-tree-group`, `nav-tree-leaf`, `nav-tree-caret`; `@wasichai/ui/themes/portal-tributario.css`
paints them.

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

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
| `systemThemes` | `{ light: 'light', dark: 'dark' }` | what `system` and an unknown id resolve to on a light / dark OS, see [Themes](#themes-and-preferences) |

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

A new user's preference is `system` (nothing stored, or the API's `{ "theme": "system" }`), so an app makes its own
themes the default with `systemThemes`: a new user opens on `systemThemes.light` (`.dark` on a dark OS), following the
system switches between the two, `light` and `dark` stay in the selector, and `resolveConfig` throws when an id is not
a theme or has the other `colorScheme`.

```ts
// config
themes: [
  { id: 'acme-day', label: 'theme.acmeDay', colorScheme: 'light' },
  { id: 'acme-night', label: 'theme.acmeNight', colorScheme: 'dark' }
],
systemThemes: { light: 'acme-day', dark: 'acme-night' }
```

To avoid a flash of the light theme before React mounts, put this boot script in `index.html`, before the
bundle. It lists every theme the app offers with its color scheme, so a stored app theme gets its
`colorScheme` before the bundle loads and an unknown id falls to the OS, as `resolveTheme` does. `system` lists
the app's `config.systemThemes` (light/dark when unset). This one is for an app with `portal-tributario`; put your
own `config.themes` ids in `schemes`.

```html
<script>
  // before the bundle: apply the stored theme so a dark user never sees a light flash. `wasichai` = storagePrefix.
  // every theme the app offers, id -> color scheme: light, dark and each config.themes entry.
  // system and an unknown id (an old build, another app's theme) follow the os to config.systemThemes, as core's resolveTheme does
  try {
    const schemes = { light: 'light', dark: 'dark', 'portal-tributario': 'light' }
    // config.systemThemes; light / dark when unset. both ids must also be keys of schemes
    const system = { light: 'light', dark: 'dark' }
    const stored = localStorage.getItem('wasichai.theme')
    const dark = matchMedia('(prefers-color-scheme: dark)').matches
    const theme = stored && Object.hasOwn(schemes, stored) ? stored : system[dark ? 'dark' : 'light']
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = schemes[theme]
  } catch {}
</script>
```

## Tree menu (`NavTree`)

A foldable tree menu for an app's own shell (srtm-ui's and caja-ui's portals): a panel headed by the way home and a
button that folds it, a bold title, groups and subgroups that fold, and leaves in the link colour, the current one
marked in bold with a chevron. A leaf at the root is drawn like a group, with its `icon` where a group has its caret;
an `external` leaf is a plain `<a>` to another app, never current. A leaf at the root gets no current mark, only
`aria-current`; the indentation covers groups and one level of subgroups.

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

The caller keeps the state: `open` hides the panel, and `groups` maps a group's key (its labels from the
root joined by `/`, e.g. `Tributos/Impuesto predial`) to whether it is open: `false` folds it, a missing key is open. An app
extends `NavTreeLeaf` with its own fields, and the helpers keep that type: `navTreeLeaves(nodes)` lists the leaves, `currentNavTreeLeaf(nodes, pathname)`
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

Errors: `api()` rejects with an `ApiError` (`status`, `message`, `violations`). `describeError(cause)` gives
the line every core screen shows for a refusal, `message — field: reason — …`, and `String(cause)` for anything
else. `formError(cause)` splits it for a form instead: `{ message, violations }`, each violation drawn under its field.

## Write rules and change reason

An object definition carries three write rules (backend 0.3.0; an older server sends none, read as `false`):

| flag | the generic UI does not offer | the server answers |
|---|---|---|
| `appendOnly` | edit, delete, link/unlink (either end), workflow transitions; create stays | `409` |
| `apiOnly` | create, edit, delete, link/unlink (either end); transitions stay | `403` |
| `requiresReason` | any write without a reason: create, edit, delete, link/unlink (either end), transitions | `400`, `errors: [{ field: "reason" }]` |

`writePolicy(...objects)` turns the flags into `canCreate`, `canUpdate`, `canDelete`, `canLink`, `canTransition` and
`requiresReason` (a link passes both ends). `useWritePolicy(objectName, otherObjectName?)` reads the definitions;
`loaded` is `false` until they arrive (keep write buttons disabled: a write now would skip the prompt), and a failed
read counts as loaded with no rules. `WritePolicyNotice` says why a write is missing (`scope="link"` for a link).

The reason travels in `X-Change-Reason`, always in the RFC 8187 form `UTF-8''` + percent-encoded UTF-8, so accents,
line breaks and emoji survive (`changeReasonHeader(reason)`; blank sends no header). It is trimmed and holds 1–500
code points, no control characters but tab and line breaks (`reasonProblem(reason)`). `useSaveRecord`,
`useDeleteRecord` and `useLinkRelated` take it beside their old input: `{ payload, reason }`, `{ id, reason }`,
`{ otherId, reason }`. `ReasonDialog` asks for it; `useReasonPrompt` asks only when required, sends nothing on cancel,
keeps the dialog open on a refused reason and never rethrows (read the mutation's `error`; while `prompt.dialog` is
up, skip an error `reasonRefusal(error)` names, the dialog already says it):

```tsx
function DeleteButton({ object, id }: { object: string; id: string }) {
  const { t } = useTranslation()
  const policy = useWritePolicy(object)
  const remove = useDeleteRecord(object)
  const prompt = useReasonPrompt()
  if (policy.loaded && !policy.canDelete) return <WritePolicyNotice policy={policy} />
  const onDelete = () => prompt.withReason((reason) => remove.mutateAsync({ id, reason }), { required: policy.requiresReason })
  return (
    <>
      <Button disabled={!policy.loaded || remove.isPending} onClick={onDelete}>
        {t('common.delete')}
      </Button>
      {remove.error && <Alert tone="danger">{describeError(remove.error)}</Alert>}
      {prompt.dialog}
    </>
  )
}
```

The core record screens follow these rules on their own. `DynamicForm` draws a required **Motivo** field when the
object has `requiresReason` (checked with the other fields, emptied once the saved record's `updatedAt` moves) and
calls `onSubmit(payload, reason)`; without the rule it calls `onSubmit(payload)` as before. Its `violations` prop
puts each refused field's message under that field (a 409 on a unique pair marks both fields, a 400 on `reason` marks
the reason) and keeps a violation naming no drawn field in the banner. `PageRenderer` passes both through and offers
no save on an append-only or api-only object; the detail page says why, and the new-record page draws no form on an
api-only object. A read-only form still shows the page's module fields (a geometry, …): through the renderer's
`display` when it has one, otherwise as its input widget made `inert`.

The record list hides **Nuevo registro** on an api-only object and the row delete on an append-only or api-only one,
saying why; with `requiresReason` its delete asks for the reason in place of the plain confirmation. `RelatedList`
(many-to-many) asks for the reason before a link or an unlink when either end requires one, holds both while the two
definitions load, and replaces picker and unlink with a notice when either end is append-only or api-only.

Every history and audit entry carries `reason` (`null` when none was given) and `serviceAccount` (the account's name
when one wrote it, `null` otherwise; an older server sends neither and they read as `null`). `RecordHistory` shows the
reason under the entry, and the audit page in its own column. `AuditActor` names who wrote an entry: the service
account with a **Cuenta de servicio** badge (never its backing address), else the user's email, else **Sistema**.

The object editor sets the three rules, ticks `indexed` on a field (not on `LONG_TEXT`, `FILE` or `IMAGE`, which the
server will not index, nor on a module type that cannot be unique) and edits the composite `indexes` (1–32 fields, in
index order) and `uniqueConstraints` (2–32; one field is `unique` on the field itself), checking each set as it is
typed the way the server will. The object's `PUT` keeps whatever it is not sent, so the editor sends a rule or a list
only when it changed (`objectUpdatePayload`): saving the labels never rewrites a rule someone else just set, and `[]`
drops every set of a list. A refetch (every field or relationship change makes one) keeps each rule or list edited and
not yet saved, and takes the server's value for the rest (`rebaseDetails`).

It also lists the object's declared actions (ADR-042), declares one (`useCreateObjectAction`: the name is sent upper
case, a blank label is left out and the server uses the name) and removes one with every grant of it
(`useDeleteObjectAction`, which also refreshes the cached roles). `actionNameProblem(name, existing)` mirrors the
server's refusals: not `^[A-Z][A-Z0-9_]{1,48}$`, one of `BUILT_IN_ACTIONS`, or already declared.

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

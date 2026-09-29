# @wasichai/ui

Module guide: [docs/modules/core.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/core.md) (ui has no module doc of its own).

Primitives shared by every wasichai package: `Button`, `Card*`, `Dialog*`, `Input`, `Textarea`, `Label`,
`Select*`, `Table`/`Th`/`Td`/`Badge`, `Tabs`, the `cn()` class merger, the Tailwind 4 theme
tokens (`theme.css`) and an optional theme sheet ([portal-tributario](#optional-theme-portal-tributario)).
Four more carry the footers and dialogs every list and record screen ends up needing:

- `ConfirmDialog`: a question before something that cannot be undone (danger or primary confirm, a busy state, an error line).
- `Pagination`: the footer of a server-paged list, the record count plus previous/next arrows when there is more than one page.
- `PageSizePagination`: the footer of a client-paged list, a rows-per-page picker, the "1 to 10 of 47 records" range and the arrows.
- `PdfDialog`: a generated PDF embedded in a dialog, to see, print or download; it loads the blob itself and revokes its URL on close.

Peer dependencies: `react`, `react-dom`, `react-i18next` (the dialogs' close label and the four primitives above read `common.*`
strings, see [Strings](#strings-common)).

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```
yarn add @wasichai/ui
```

## Tailwind (required)

The packages ship class names, not compiled CSS. Your app's Tailwind 4 build must see them:

```css
/* src/index.css */
@import 'tailwindcss';
@import '@wasichai/ui/theme.css';
@source '../node_modules/@wasichai';
```

`@source` is relative to the css file. Point it at the `node_modules/@wasichai` folder your app
resolves (in a monorepo, often the root `node_modules`).

## Strings (`common.*`)

The primitives ship no words. Their labels are `common.*` keys (`common.records`, `common.range`, `common.previousPage`,
`common.rows`, `common.pdfPreview`, `common.close`…) that live in `@wasichai/core`'s bundle, in `es` and `en`: `@wasichai/ui`
imports nothing from core (rule 3). An app on `WasichaiApp` has them; an app that does not load core's bundle supplies the
same keys itself.

An app may override any wording with i18next. `addResourceBundle(language, namespace, strings, deep, overwrite)` with the last
two `true` merges over what core registered:

```ts
i18n.addResourceBundle('es', 'common', { records_one: '{{count, number}} expediente', records_other: '{{count, number}} expedientes' }, true, true)
```

Counts and ranges are written `{{count, number}}`, `{{from, number}}`, `{{to, number}}`: i18next's `number` format, which groups
digits by the language's locale. An app that wants another rendering (no grouping, another separator) swaps that one formatter and
every string follows:

```ts
i18n.services.formatter?.add('number', (value, lng) => new Intl.NumberFormat(lng, { useGrouping: false }).format(value))
```

Spanish plural keys need a `_many` twin. `Intl.PluralRules('es')` answers `many` for the multiples of 1,000,000, so i18next asks
for `records_many` there and, if it is missing, prints the raw key. Core's `es` bundle writes `_one`, `_other` and `_many` (the
same text as `_other`); an override of a plural string in Spanish does the same.

## Theme tokens

`theme.css` sets every token for `light` (also `:root`) and `dark` and maps each to a Tailwind colour (`bg-surface`,
`text-ink-muted`, `border-line`…). An app theme is a `[data-theme='<id>']` block that sets all 28: the 18 base tokens
(ADR-034) and the 10 extension tokens (ADR-035).

| Base token      | For                                                         |
| --------------- | ----------------------------------------------------------- |
| `surface`       | cards, dialogs, fields and tables                           |
| `surface-muted` | the page behind them and quiet fills (hovers, table header) |
| `border`        | borders and dividers                                        |
| `ink`           | text                                                        |
| `ink-muted`     | secondary text: labels, hints, placeholders                 |
| `brand`         | primary buttons and active marks                            |
| `brand-strong`  | `brand` on hover, and text in the brand colour              |
| `brand-soft`    | selected rows and highlighted options                       |
| `on-brand`      | text on `brand`                                             |
| `shell`         | the app shell's sidebar and the login page                  |
| `shell-muted`   | secondary text on `shell`                                   |
| `shell-ink`     | text on `shell`                                             |
| `danger`        | errors and destructive actions                              |
| `on-danger`     | text on `danger`                                            |
| `success`       | success text                                                |
| `warning`       | warning text                                                |
| `warning-soft`  | a warning's background                                      |
| `overlay`       | the veil behind a dialog                                    |

| Extension token | For                                                      |
| --------------- | -------------------------------------------------------- |
| `success-soft`  | a success message's background                           |
| `danger-soft`   | an error message's background                            |
| `notice`        | a notice's text (neither success, warning nor error)     |
| `notice-soft`   | a notice's background                                    |
| `link`          | text links                                               |
| `focus`         | the focus ring and a focused field's border              |
| `table-head`    | a table's header row                                     |
| `table-stripe`  | zebra rows                                               |
| `line`          | thin lines between rows                                  |
| `map-selected`  | the selected feature on a map (`#e8590c` in every theme) |

In `light` and `dark` the extension tokens alias a base token (`link` and `focus` are `brand`, `table-head` is
`surface-muted`, `line` is `border`) or tint one, so nothing drawn before changes. The exception is `bg-danger-soft`:
`@wasichai/documents` already used it for its error messages, where it generated nothing, and now it paints a soft
red. Light `success` is `oklch(52% 0.13 155)`, darker than before, so success text passes AA on `surface` (5.0:1) and
on `bg-success-soft` (4.6:1).

A theme may also set `--font-sans` and `--radius`, `--radius-sm`..`--radius-xl`, `--radius-card`: the document font
and the `rounded*` utilities read them (the bare `rounded` too).

## Styling hooks (`data-slot`)

The components carry `data-slot` attributes that a theme sheet can style:

| Component            | `data-slot`      | Also                                                                                         |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `Button`             | `button`         | `data-variant` (`primary`, `secondary`, `ghost`, `danger`), `data-size` (`sm`, `md`, `icon`) |
| `Card`               | `card`           |                                                                                              |
| `Input`              | `input`          |                                                                                              |
| `Textarea`           | `textarea`       |                                                                                              |
| `SelectTrigger`      | `select-trigger` |                                                                                              |
| `Pagination`         | `pagination`     | `data-mode="server"`, the footer of a server-paged list                                      |
| `PageSizePagination` | `pagination`     | `data-mode="client"`, the footer of a client-paged list                                      |
|                      | `native-select`  | its rows-per-page `<select>`                                                                 |
| `ConfirmDialog`      | `confirm-dialog` | the dialog's content box (the overlay and the X are `Dialog`'s)                              |
| `PdfDialog`          | `pdf-dialog`     | the dialog's content box                                                                     |
| `Table`              | `table`          | on the `<table>`, not its scroll box                                                         |
| `Th`                 | `table-head`     |                                                                                              |
| `Td`                 | `table-cell`     |                                                                                              |
| `Badge`              | `badge`          |                                                                                              |
| `Tabs`               | `tabs`           | the root                                                                                     |
|                      | `tabs-list`      | the `role="tablist"` strip                                                                   |
|                      | `tabs-trigger`   | each `role="tab"`, with `aria-selected`                                                      |
|                      | `tabs-content`   | each `role="tabpanel"`                                                                       |

They never change `light` or `dark`: `theme.css` does not style them. A theme sheet targets them in its own scope
(`@scope ([data-theme='<id>'])`). An unlayered rule wins over the Tailwind utilities whatever their specificity, so it
restyles the component, but it also wins over a caller's classes for the same property: the library cannot tell its
own default classes from a caller's. A sheet therefore sets only what its tokens cannot, and puts in `@layer base` the
defaults a class may override. An app component may carry the same hooks
(`data-slot="button" data-variant="primary"`) to be painted like the library's under such a theme.

## Optional theme: portal-tributario

A light-only theme from wasichai/srtm-ui, the prototype of an online municipal tax portal: Arial 14px, 3px corners, a
steel-blue brand, zebra tables under a bold grey header, folder tabs over a bordered panel, and the prototype's
buttons and fields (15px buttons, 38px fields with a cyan focus glow, invalid ones in red). It is not built in:
`@wasichai/ui/themes/portal-tributario.css` holds its tokens and partials that paint the library's components through
the hooks above. Light and dark do not change.

To offer it, an app imports the sheet after `theme.css`, lists `PORTAL_TRIBUTARIO_THEME` (`@wasichai/core`) in
`config.themes` and adds `'portal-tributario': 'light'` to the boot script's `schemes` map (see `@wasichai/core`'s
README):

```css
/* src/index.css */
@import 'tailwindcss';
@import '@wasichai/ui/theme.css';
@import '@wasichai/ui/themes/portal-tributario.css';
@source '../node_modules/@wasichai';
```

```tsx
import { PORTAL_TRIBUTARIO_THEME, WasichaiApp } from '@wasichai/core'

<WasichaiApp config={{ apiBaseUrl: '/api', themes: [PORTAL_TRIBUTARIO_THEME] }} modules={[]} />
```

What the sheet sets, under the theme only:

- **Buttons**: 15px text, the prototype's room (`md` 10px 20px, primary and danger 26px at the sides, `sm` 5px top
  and bottom), a `#ccc` border and grey hover on secondary, a darker hover on danger, a not-allowed cursor when
  disabled. The fills, the radii and `ghost` are the classes' own: under the theme's tokens they already look right,
  and a caller's classes there (the shell's ghost buttons) keep working.
- **Fields** (`input`, `textarea`, `select-trigger`): a `#ccc` border, 14.5px text, 38px high, the cyan focus glow and
  the danger border when invalid. Their sides stay the library's, so a field's own room (the search box's icon)
  holds.
- **Tables**: the header (13.5px bold sentence case over `table-head`) and the cells (14.5px over `line`); the zebra
  rows and the total row are defaults in `@layer base`, so a row's own class (a selected row, a hover) wins.
- **Tabs**: folder tabs over a bordered panel. A `Card` that directly holds a `Tabs` steps aside (no border,
  background, shadow or bottom padding), so the tabs sit on the page and the panel is the box.

The partials stop at a subtree pinned to another theme (the printed document sheet stays light); the theme's font and
radii still reach it, since they are Tailwind theme variables, not tokens. Native radios and checkboxes, a
link-coloured `ghost` and anything an app draws itself are the app's to style. Why the tokens, hooks and sheet look
this way:
[ADR-035](https://github.com/wasichai/wasichai/blob/main/docs/adr/0035-theme-extension-tokens-slots-and-optional-sheets.md).

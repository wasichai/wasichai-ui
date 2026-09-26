# @wasichai/documents

Module guide: [docs/modules/documents.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/documents.md).

Document templates for wasichai apps: an admin writes a template per object (rich text with field,
platform-value and related-table placeholders), a record issues numbered documents from it, and each
issued document has a printable page. Issuing shows up in the record's history.

## Install

```ini
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```bash
yarn add @wasichai/core @wasichai/ui @wasichai/documents
```

`@tiptap/core`, `@tiptap/react` and `@tiptap/starter-kit` come with it. The template editor is
loaded lazily, so tiptap stays out of your first bundle.

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { documentsModule } from '@wasichai/documents'
import '@wasichai/documents/print.css'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'Catastro' }} modules={[documentsModule()]} />
}
```

Import `@wasichai/documents/print.css` once, anywhere in the app. It gives the printed sheet its
A4 page, heading sizes and table reflow, and it keeps the ARCHIVED mark visible on paper. It is
plain, unlayered CSS on purpose: it must win over Tailwind's preflight without `!important`.

## What it adds

| Slot | Contribution |
|---|---|
| route `documents:types` | `/builder/documents`: the document types builder |
| route `documents:print` | `/documents/:id/print`: the printable page (chrome `bare`, signed in, no shell) |
| nav | "Documentos" in the Builder group |
| `recordPanels` | "Documentos emitidos" under every record: issue a document, list and open issued ones |
| `historyRenderers.ISSUE` | an "Emisión" badge and a "Ver documento" link on the record's history |
| i18n | namespace `documents` (es, en) |

Links to the print page are built with `useWasichaiLinks().to('documents:print', { id })`, so they
follow whatever base path you pick.

## Options

| Option | Default | Meaning |
|---|---|---|
| `basePath` | `''` | prefix of both routes: `documentsModule({ basePath: 'docs' })` serves `/docs/builder/documents` and `/docs/documents/:id/print` |

## Backend

Needs the wasichai documents backend module. Paths are the backend's routes. The frontend reaches them through
`apiBaseUrl` (default `/api`), so a proxy that mounts the API elsewhere changes the prefix, not these paths.
- `/objects/{object}/document-types`
- `/objects/{object}/records/{id}/documents`
- `/documents/{id}`

When that module is not installed, those endpoints must answer 404 (not 403). The record panel
then shows no documents, and the history shows no link.

## Differs from the original app

Issuing a document also refreshes the record's history, so the new "Emisión" entry shows up without
a manual reload.

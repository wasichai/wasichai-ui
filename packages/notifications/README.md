# @wasichai/notifications

Module guide: [docs/modules/notifications.md](https://github.com/wasichai/wasichai/blob/main/docs/modules/notifications.md).

The "Alertas" bell and inbox. The bell shows the unread count (and a dot when a to-do is overdue) with a live summary
from the backend's stream; the page lists the person's alerts in three tabs (Comunicados, Advertencias, Pendientes),
with mark read, snooze, dismiss and "mark all as read". Without the notifications module on the backend (`404`), or for
a service account (`403`), the bell hides itself.

## Install

```
# .npmrc
@wasichai:registry=https://npm.pkg.github.com
```

```
yarn add @wasichai/core @wasichai/ui @wasichai/notifications
```

## Usage

```tsx
import { WasichaiApp } from '@wasichai/core'
import { notificationsModule } from '@wasichai/notifications'

export function App() {
  return <WasichaiApp config={{ apiBaseUrl: '/api', appName: 'My App' }} modules={[notificationsModule()]} />
}
```

The module adds the bell to the shell and the page at `/notifications`. `notificationsModule({ resolveLink })` takes the
app's own resolver for the links inside alerts (see below).

## An app with its own shell

Mount the pieces yourself. `NotificationsProvider` goes inside the app's providers and signed-in user; it opens one
stream per browser (tabs share it).

```tsx
import { InboxPage, NotificationBell, NotificationsProvider } from '@wasichai/notifications'

<NotificationsProvider inboxPath="/alertas" resolveLink={resolveLink}>
  <Header actions={<NotificationBell />} />
  <Routes>
    <Route path="/alertas" element={<InboxPage />} />
  </Routes>
</NotificationsProvider>
```

- `NotificationBell` also draws the toasts for new alerts; pass `toasts={false}` and mount `<NotificationToasts />`
  yourself to place them elsewhere.
- `InboxPage` reads its tab from `?tab=INFO|WARNING|ACTION`.
- `NotificationLinkView` renders a title as a link and marks the alert read on click. The hooks
  (`useNotifications`, `useNotificationSummary`, `useMarkRead`, `useSnooze`, `useDismiss`, `useReadAll`) are exported
  for a screen of your own.

## Links

An alert may carry a link: a `RECORD`, a `ROUTE` or a `URL`. By default core's links turn them into hrefs; a `URL`
opens only for `http` and `https`, with `rel="noopener noreferrer"`. A resolver replaces the rules:

```ts
import { defaultResolveLink, type NotificationLinkResolver } from '@wasichai/notifications'

const resolveLink: NotificationLinkResolver = (link, links) =>
  link.type === 'ROUTE' && link.route === 'caja' ? { href: '/caja', external: false } : defaultResolveLink(link, links)
```

Returning `null` shows the text without a link.

## What it adds

| Slot | Value |
|---|---|
| route `notifications:inbox` | `/notifications` → `InboxPage` (lazy) |
| nav | "Alertas" / "Notifications" in core's data group, order 90 |
| shell action | `NotificationBell` |
| provider | `NotificationsProvider` |
| i18n | namespace `notifications` (es, en) |

A body and a title are always plain text, never HTML.

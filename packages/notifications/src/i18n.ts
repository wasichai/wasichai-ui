// the module's own strings, loaded under the namespace 'notifications'
export const notificationsMessages = {
  es: {
    nav: { inbox: 'Alertas' },
    notifications: {
      title: 'Alertas',
      kinds: { INFO: 'Comunicados', WARNING: 'Advertencias', ACTION: 'Pendientes' },
      bell: { label: 'Alertas, {{count}} sin leer', announce: '{{count}} alertas sin leer', overdue: 'Hay pendientes vencidos' },
      toast: { view: 'Ver en Alertas' }
    }
  },
  en: {
    nav: { inbox: 'Notifications' },
    notifications: {
      title: 'Notifications',
      kinds: { INFO: 'Announcements', WARNING: 'Warnings', ACTION: 'To do' },
      bell: { label: 'Notifications, {{count}} unread', announce: '{{count}} unread notifications', overdue: 'Some to-dos are overdue' },
      toast: { view: 'See in Notifications' }
    }
  }
}

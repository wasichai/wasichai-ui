// the module's own strings, loaded under the namespace 'notifications'
export const notificationsMessages = {
  es: {
    nav: { inbox: 'Alertas' },
    notifications: {
      title: 'Alertas',
      kinds: { INFO: 'Comunicados', WARNING: 'Advertencias', ACTION: 'Pendientes' },
      bell: {
        label: 'Alertas, {{count}} sin leer',
        announce_one: '{{count}} alerta sin leer',
        announce_other: '{{count}} alertas sin leer',
        overdue: 'Hay pendientes vencidos'
      },
      toast: { view: 'Ver en Alertas' },
      inbox: {
        state: 'Mostrar',
        states: { active: 'Activas', unread: 'Sin leer', snoozed: 'Pospuestas' },
        empty: 'No hay alertas aquí',
        published: 'Publicada {{date}}',
        due: 'Vence {{date}}',
        overdue: 'Vencida',
        snoozedUntil: 'Pospuesta hasta {{date}}',
        markRead: 'Marcar como leída',
        readAll: 'Marcar todo como leído',
        dismiss: 'Descartar',
        snooze: 'Posponer',
        snoozeOptions: { hour: 'Una hora', tomorrow: 'Mañana a las 8:00', week: 'Una semana' },
        unread: 'Sin leer'
      }
    }
  },
  en: {
    nav: { inbox: 'Notifications' },
    notifications: {
      title: 'Notifications',
      kinds: { INFO: 'Announcements', WARNING: 'Warnings', ACTION: 'To do' },
      bell: {
        label: 'Notifications, {{count}} unread',
        announce_one: '{{count}} unread notification',
        announce_other: '{{count}} unread notifications',
        overdue: 'Some to-dos are overdue'
      },
      toast: { view: 'See in Notifications' },
      inbox: {
        state: 'Show',
        states: { active: 'Active', unread: 'Unread', snoozed: 'Snoozed' },
        empty: 'No notifications here',
        published: 'Published {{date}}',
        due: 'Due {{date}}',
        overdue: 'Overdue',
        snoozedUntil: 'Snoozed until {{date}}',
        markRead: 'Mark as read',
        readAll: 'Mark all as read',
        dismiss: 'Dismiss',
        snooze: 'Snooze',
        snoozeOptions: { hour: 'One hour', tomorrow: 'Tomorrow at 8:00', week: 'One week' },
        unread: 'Unread'
      }
    }
  }
}

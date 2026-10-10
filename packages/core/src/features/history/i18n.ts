// the history screens own their strings; coreBundles merges them into common.
const es = {
  history: {
    title: 'Historial',
    subtitle: 'Quién cambió qué y cuándo',
    empty: 'Sin cambios registrados',
    unavailable: 'Historial no disponible',
    system: 'Sistema',
    serviceAccount: 'Cuenta de servicio',
    reason: 'Motivo',
    changes: 'Cambios',
    noChanges: 'Sin campos modificados',
    showChanges: 'Ver cambios',
    hideChanges: 'Ocultar cambios',
    filters: 'Filtros',
    object: 'Objeto',
    allObjects: 'Todos los objetos',
    operation: 'Operación',
    allOperations: 'Todas las operaciones',
    limit: 'Máximo',
    user: 'Usuario',
    record: 'Registro',
    occurredAt: 'Fecha',
    complexValue: 'valor actualizado',
    none: '—',
    yes: 'Sí',
    no: 'No',
    operations: {
      CREATE: 'Creación',
      UPDATE: 'Modificación',
      DELETE: 'Eliminación'
    }
  }
}

const en = {
  history: {
    title: 'History',
    subtitle: 'Who changed what, and when',
    empty: 'No changes recorded',
    unavailable: 'History unavailable',
    system: 'System',
    serviceAccount: 'Service account',
    reason: 'Reason',
    changes: 'Changes',
    noChanges: 'No fields changed',
    showChanges: 'Show changes',
    hideChanges: 'Hide changes',
    filters: 'Filters',
    object: 'Object',
    allObjects: 'All objects',
    operation: 'Operation',
    allOperations: 'All operations',
    limit: 'Limit',
    user: 'User',
    record: 'Record',
    occurredAt: 'Date',
    complexValue: 'value updated',
    none: '—',
    yes: 'Yes',
    no: 'No',
    operations: {
      CREATE: 'Create',
      UPDATE: 'Update',
      DELETE: 'Delete'
    }
  }
}

// merged into core's `common` namespace by createWasichaiI18n (coreBundles)
export const historyMessages = { es, en }

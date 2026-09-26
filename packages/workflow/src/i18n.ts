// the workflow screens own their strings, loaded under the `workflow` namespace. `pages.*` keeps the
// original key paths the transition button, its picker and the builder preview were written against.
const es = {
  nav: { workflows: 'Workflows' },
  pageComponents: { WORKFLOW: 'Workflow' },
  pageActions: { TRANSITION: 'Dispara una transición' },
  pages: {
    action: 'Acción',
    transition: 'Transición',
    transitionGone: 'Esta transición ya no existe en el workflow',
    mockWorkflow: { initialState: 'Estado inicial' }
  },
  workflows: {
    title: 'Flujos de trabajo',
    subtitle: 'Estados por los que pasa un registro y quién puede moverlo',
    object: 'Objeto',
    selectObject: 'Elige un objeto',
    selectState: 'Elige un estado',
    panelTitle: 'Flujo de trabajo',
    currentState: 'Estado actual',
    unknownState: 'Sin estado',
    noTransitions: 'No hay transiciones desde este estado',
    notAllowed: 'No puedes aplicar esta transición',
    applying: 'Aplicando…',
    moveTo: 'Pasa a {{state}}',
    conflict: 'El registro cambió de estado mientras mirabas. Vuelve a cargarlo.',
    newHint: 'Este objeto todavía no tiene flujo. Este es un punto de partida: edítalo y guárdalo.',
    name: 'Nombre técnico',
    label: 'Etiqueta',
    enabled: 'Activo',
    enabledHint: 'Un flujo inactivo no muestra botones en el registro',
    addState: 'Añadir estado',
    stateName: 'Nombre',
    stateLabel: 'Etiqueta',
    stateType: 'Tipo',
    types: {
      INITIAL: 'Inicial',
      INTERMEDIATE: 'Intermedio',
      FINAL: 'Final'
    },
    from: 'Desde',
    to: 'Hasta',
    roles: 'Roles',
    anyRole: 'Cualquiera que pueda editar',
    rolesHint: 'Sin roles marcados, la transición la puede aplicar cualquiera que pueda editar el registro',
    save: 'Guardar flujo',
    delete: 'Eliminar flujo',
    confirmDelete: '¿Eliminar el flujo de {{object}}? Los registros conservarán su estado.',
    unavailable: 'Flujos de trabajo no disponibles',
    inspector: 'Detalles',
    stateSelected: 'Estado',
    transitionSelected: 'Transición',
    selectHint: 'Elige un estado o una transición en el lienzo para editarlo. Arrastra de un estado a otro para conectarlos.',
    autoLayout: 'Recolocar',
    deleteSelected: 'Eliminar lo seleccionado',
    finalHint: 'De un estado final no sale ninguna transición',
    refusals: {
      FINAL_HAS_EXIT: '«{{value}}» es un estado final: no puede tener salidas',
      UNKNOWN_STATE: 'El estado «{{value}}» no existe'
    },
    problems: {
      NO_STATES: 'Define al menos un estado',
      NO_INITIAL: 'Falta el estado inicial: marca uno como Inicial',
      MANY_INITIAL: 'Solo puede haber un estado inicial',
      DUPLICATE_STATE: 'El estado «{{value}}» está repetido',
      DUPLICATE_TRANSITION: 'La transición «{{value}}» está repetida',
      UNKNOWN_FROM: 'La transición «{{value}}» sale de un estado que no existe',
      UNKNOWN_TO: 'La transición «{{value}}» apunta a un estado que no existe'
    },
    starter: {
      workflowLabel: 'Aprobación',
      draft: 'Borrador',
      review: 'En revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      send: 'Enviar a revisión',
      approve: 'Aprobar',
      reject: 'Rechazar'
    }
  }
}

const en: typeof es = {
  nav: { workflows: 'Workflows' },
  pageComponents: { WORKFLOW: 'Workflow' },
  pageActions: { TRANSITION: 'Fires a transition' },
  pages: {
    action: 'Action',
    transition: 'Transition',
    transitionGone: 'This transition is no longer in the workflow',
    mockWorkflow: { initialState: 'Initial state' }
  },
  workflows: {
    title: 'Workflows',
    subtitle: 'The states a record moves through, and who may move it',
    object: 'Object',
    selectObject: 'Pick an object',
    selectState: 'Pick a state',
    panelTitle: 'Workflow',
    currentState: 'Current state',
    unknownState: 'No state',
    noTransitions: 'Nothing leaves this state',
    notAllowed: 'You cannot apply this transition',
    applying: 'Applying…',
    moveTo: 'Moves to {{state}}',
    conflict: 'The record changed state while you were looking. Reload it.',
    newHint: 'This object has no workflow yet. Here is a starting point: edit it and save.',
    name: 'Technical name',
    label: 'Label',
    enabled: 'Enabled',
    enabledHint: 'A disabled workflow shows no buttons on the record',
    addState: 'Add state',
    stateName: 'Name',
    stateLabel: 'Label',
    stateType: 'Type',
    types: {
      INITIAL: 'Initial',
      INTERMEDIATE: 'Intermediate',
      FINAL: 'Final'
    },
    from: 'From',
    to: 'To',
    roles: 'Roles',
    anyRole: 'Anyone who may update',
    rolesHint: 'With no role ticked, anyone who may update the record can apply the transition',
    save: 'Save workflow',
    delete: 'Delete workflow',
    confirmDelete: 'Delete the workflow of {{object}}? Records keep their state.',
    unavailable: 'Workflows unavailable',
    inspector: 'Details',
    stateSelected: 'State',
    transitionSelected: 'Transition',
    selectHint: 'Pick a state or a transition on the canvas to edit it. Drag from one state to another to connect them.',
    autoLayout: 'Rearrange',
    deleteSelected: 'Delete selection',
    finalHint: 'Nothing leaves a final state',
    refusals: {
      FINAL_HAS_EXIT: '"{{value}}" is a final state: it can have no way out',
      UNKNOWN_STATE: 'State "{{value}}" does not exist'
    },
    problems: {
      NO_STATES: 'Define at least one state',
      NO_INITIAL: 'No initial state: mark one as Initial',
      MANY_INITIAL: 'Only one state can be the initial one',
      DUPLICATE_STATE: 'State "{{value}}" is repeated',
      DUPLICATE_TRANSITION: 'Transition "{{value}}" is repeated',
      UNKNOWN_FROM: 'Transition "{{value}}" leaves a state that does not exist',
      UNKNOWN_TO: 'Transition "{{value}}" points at a state that does not exist'
    },
    starter: {
      workflowLabel: 'Approval',
      draft: 'Draft',
      review: 'In review',
      approved: 'Approved',
      rejected: 'Rejected',
      send: 'Send to review',
      approve: 'Approve',
      reject: 'Reject'
    }
  }
}

export const workflowMessages = { es, en }

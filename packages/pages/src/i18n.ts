// the pages namespace. keys keep their original paths (pages.*), copied out of core common.json.
// no MAP, WORKFLOW or TRANSITION strings: gis and workflow ship their own.
export const pagesMessages = {
  es: {
    nav: {
      pages: 'Páginas'
    },
    pages: {
      title: 'Páginas',
      subtitle: 'Define qué componentes aparecen en la página de detalle de cada objeto',
      object: 'Objeto',
      stored: 'Configurada',
      generated: 'Por defecto',
      generatedHint: 'Esta página se generó a partir de la metadata. Al guardar se convierte en configurada.',
      label: 'Etiqueta',
      template: 'Plantilla',
      changeTemplate: 'Cambiar',
      templatePicker: {
        title: 'Elegir plantilla',
        hint: 'Elige cómo se reparte la página en regiones.',
        regions: 'Regiones',
        next: 'Siguiente',
        back: 'Atrás',
        apply: 'Aplicar',
        moveTitle: '¿A dónde van estos componentes?',
        moveHint: 'Estas regiones desaparecen con la nueva plantilla. Elige a dónde se mueve lo que contienen.',
        moveTo: 'Mover a',
        moveCount_one: '{{count}} componente se mueve',
        moveCount_other: '{{count}} componentes se mueven'
      },
      regions: {
        HEADER: 'Encabezado',
        MAIN: 'Principal',
        LEFT: 'Izquierda',
        CENTER: 'Centro',
        RIGHT: 'Derecha'
      },
      templates: {
        'one-region': {
          label: 'Una región',
          description: 'Una sola región, a todo lo ancho.'
        },
        'two-regions': {
          label: 'Dos regiones',
          description: 'Una región principal y una lateral, una junto a la otra.'
        },
        'three-regions': {
          label: 'Tres regiones',
          description: 'Izquierda, principal y derecha, una junto a la otra.'
        },
        'header-and-one-region': {
          label: 'Encabezado y una región',
          description: 'Un encabezado arriba y una región debajo, a todo lo ancho.'
        },
        'header-and-two-regions': {
          label: 'Encabezado y dos regiones',
          description: 'Un encabezado arriba, principal y lateral debajo.'
        },
        'header-and-three-regions': {
          label: 'Encabezado y tres regiones',
          description: 'Un encabezado arriba, izquierda, principal y derecha debajo.'
        },
        'header-and-left-sidebar': {
          label: 'Encabezado y barra lateral izquierda',
          description: 'Un encabezado arriba, una barra lateral y la región principal debajo.'
        },
        'header-and-right-sidebar': {
          label: 'Encabezado y barra lateral derecha',
          description: 'Un encabezado arriba, la región principal y una barra lateral debajo.'
        },
        'main-and-left-sidebar': {
          label: 'Principal y barra lateral izquierda',
          description: 'Una barra lateral a la izquierda y la región principal a su derecha.'
        },
        'main-and-right-sidebar': {
          label: 'Principal y barra lateral derecha',
          description: 'Una región principal y una barra lateral a la derecha.'
        }
      },
      layout: 'Diseño',
      layouts: {
        'single-column': 'Una columna',
        'two-column': 'Dos columnas'
      },
      componentTitle: 'Título',
      column: 'Columna',
      relationship: 'Relación',
      fields: 'Campos (separados por coma)',
      fieldsHint: 'Vacío muestra todos los campos del objeto, en su orden.',
      content: 'Contenido',
      reset: 'Restablecer',
      confirmReset: '¿Restablecer la página por defecto? Se pierde la configuración guardada, incluida la plantilla elegida.',
      types: {
        PAGE: 'Página',
        REGION: 'Región',
        TABS: 'Pestañas',
        TAB: 'Pestaña',
        SECTION: 'Sección',
        FORM: 'Formulario',
        RELATED_LIST: 'Lista relacionada',
        TEXT: 'Texto',
        HISTORY: 'Historial',
        ACTION: 'Acción',
        DYNAMIC_FORM: 'Formulario dinámico',
        FIELD: 'Campo'
      },
      form: 'Formulario',
      formHint: 'Un formulario guardado define sus propias secciones y campos.',
      noForm: 'Sin formulario',
      tabs: {
        builderLabel: 'Pestañas del lienzo',
        page: 'Página'
      },
      action: 'Acción',
      mockText: {
        placeholder: 'Texto de ejemplo'
      },
      palette: 'Componentes',
      paletteContainers: 'Contenedores',
      paletteContent: 'Contenido',
      paletteActions: 'Acciones',
      canvas: 'Lienzo',
      inspector: 'Propiedades',
      nothingSelected: 'Selecciona un componente para editarlo',
      dropHere: 'Arrastra un componente aquí',
      actionKind: 'Qué hace',
      actionKinds: {
        NAVIGATE: 'Lleva a otro sitio'
      },
      targetObject: 'Objeto destino',
      url: 'Enlace externo',
      style: 'Estilo',
      styles: {
        PRIMARY: 'Destacado',
        SECONDARY: 'Normal'
      },
      relationshipGone: 'Esta relación ya no existe',
      paletteFields: 'Campos',
      paletteNoFields: 'Este objeto no tiene campos todavía.',
      fieldVisible: 'Visible',
      fieldEditable: 'Editable',
      fieldReadOnly: 'El objeto define este campo como de solo lectura.',
      dynamicFormEmpty: 'Arrastra campos aquí'
    }
  },
  en: {
    nav: {
      pages: 'Pages'
    },
    pages: {
      title: 'Pages',
      subtitle: "Choose which components show on each object's detail page",
      object: 'Object',
      stored: 'Configured',
      generated: 'Default',
      generatedHint: 'This page was generated from metadata. Saving turns it into a configured one.',
      label: 'Label',
      template: 'Template',
      changeTemplate: 'Change',
      templatePicker: {
        title: 'Choose a template',
        hint: 'Choose how the page splits into regions.',
        regions: 'Regions',
        next: 'Next',
        back: 'Back',
        apply: 'Apply',
        moveTitle: 'Where do these components go?',
        moveHint: 'These regions disappear with the new template. Choose where their contents move.',
        moveTo: 'Move to',
        moveCount_one: '{{count}} component moves',
        moveCount_other: '{{count}} components move'
      },
      regions: {
        HEADER: 'Header',
        MAIN: 'Main',
        LEFT: 'Left',
        CENTER: 'Center',
        RIGHT: 'Right'
      },
      templates: {
        'one-region': {
          label: 'One region',
          description: 'A single region, full width.'
        },
        'two-regions': {
          label: 'Two regions',
          description: 'A main region and a side one, next to each other.'
        },
        'three-regions': {
          label: 'Three regions',
          description: 'Left, main and right, next to each other.'
        },
        'header-and-one-region': {
          label: 'Header and one region',
          description: 'A header on top and one region below, full width.'
        },
        'header-and-two-regions': {
          label: 'Header and two regions',
          description: 'A header on top, main and side below.'
        },
        'header-and-three-regions': {
          label: 'Header and three regions',
          description: 'A header on top, left, main and right below.'
        },
        'header-and-left-sidebar': {
          label: 'Header and left sidebar',
          description: 'A header on top, a sidebar and the main region below.'
        },
        'header-and-right-sidebar': {
          label: 'Header and right sidebar',
          description: 'A header on top, the main region and a sidebar below.'
        },
        'main-and-left-sidebar': {
          label: 'Main and left sidebar',
          description: 'A sidebar on the left and the main region beside it.'
        },
        'main-and-right-sidebar': {
          label: 'Main and right sidebar',
          description: 'A main region and a sidebar on the right.'
        }
      },
      layout: 'Layout',
      layouts: {
        'single-column': 'Single column',
        'two-column': 'Two columns'
      },
      componentTitle: 'Title',
      column: 'Column',
      relationship: 'Relationship',
      fields: 'Fields (comma separated)',
      fieldsHint: 'Empty shows every field of the object, in its own order.',
      content: 'Content',
      reset: 'Reset to default',
      confirmReset: 'Reset to the default page? The saved configuration is lost, including the chosen template.',
      types: {
        PAGE: 'Page',
        REGION: 'Region',
        TABS: 'Tabs',
        TAB: 'Tab',
        SECTION: 'Section',
        FORM: 'Form',
        RELATED_LIST: 'Related list',
        TEXT: 'Text',
        HISTORY: 'History',
        ACTION: 'Action',
        DYNAMIC_FORM: 'Dynamic form',
        FIELD: 'Field'
      },
      form: 'Form',
      formHint: 'A stored form brings its own sections and fields.',
      noForm: 'No form',
      tabs: {
        builderLabel: 'Canvas tabs',
        page: 'Page'
      },
      action: 'Action',
      mockText: {
        placeholder: 'Sample text'
      },
      palette: 'Components',
      paletteContainers: 'Containers',
      paletteContent: 'Content',
      paletteActions: 'Actions',
      canvas: 'Canvas',
      inspector: 'Properties',
      nothingSelected: 'Select a component to edit it',
      dropHere: 'Drag a component here',
      actionKind: 'What it does',
      actionKinds: {
        NAVIGATE: 'Goes somewhere'
      },
      targetObject: 'Target object',
      url: 'External link',
      style: 'Style',
      styles: {
        PRIMARY: 'Prominent',
        SECONDARY: 'Normal'
      },
      relationshipGone: 'This relationship is gone',
      paletteFields: 'Fields',
      paletteNoFields: 'This object has no fields yet.',
      fieldVisible: 'Visible',
      fieldEditable: 'Editable',
      fieldReadOnly: 'The object defines this field as read-only.',
      dynamicFormEmpty: 'Drag fields here'
    }
  }
}

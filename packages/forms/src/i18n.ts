// the form builder's own strings, loaded under the namespace 'forms'. key paths match the original app, so
// the ported page keeps calling t('forms.title').
export const formsMessages = {
  es: {
    nav: { forms: 'Formularios' },
    forms: {
      title: 'Formularios',
      subtitle: 'Agrupa los campos de un objeto en secciones con título',
      object: 'Objeto',
      form: 'Formulario',
      newForm: 'Nuevo formulario',
      pick: 'Selecciona un formulario',
      name: 'Nombre técnico',
      nameHint: 'minúsculas, sin espacios. Ej: predio_alta',
      label: 'Etiqueta',
      stored: 'Guardado',
      generated: 'Por defecto',
      generatedHint: 'Este formulario se generó a partir de la metadata. Al guardar se convierte en guardado.',
      sections: 'Secciones',
      addSection: 'Añadir sección',
      sectionTitle: 'Título de la sección',
      removeSection: 'Eliminar sección',
      noSections: 'Este formulario no tiene secciones.',
      addField: 'Añadir campo',
      noFields: 'Sección sin campos.',
      moveUp: 'Subir',
      moveDown: 'Bajar',
      reset: 'Restablecer',
      confirmReset: '¿Eliminar este formulario? Se vuelve al formulario por defecto.'
    }
  },
  en: {
    nav: { forms: 'Forms' },
    forms: {
      title: 'Forms',
      subtitle: "Group an object's fields into titled sections",
      object: 'Object',
      form: 'Form',
      newForm: 'New form',
      pick: 'Pick a form',
      name: 'Technical name',
      nameHint: 'lower case, no spaces. e.g. predio_alta',
      label: 'Label',
      stored: 'Saved',
      generated: 'Default',
      generatedHint: 'This form was generated from metadata. Saving turns it into a saved one.',
      sections: 'Sections',
      addSection: 'Add section',
      sectionTitle: 'Section title',
      removeSection: 'Remove section',
      noSections: 'This form has no sections.',
      addField: 'Add field',
      noFields: 'Section without fields.',
      moveUp: 'Move up',
      moveDown: 'Move down',
      reset: 'Reset to default',
      confirmReset: 'Delete this form? It goes back to the default form.'
    }
  }
}

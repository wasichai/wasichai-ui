// the documents namespace. core keeps no document string of its own.
export const documentsMessages = {
  es: {
    nav: { documents: 'Documentos' },
    operations: { ISSUE: 'Emisión' },
    history: {
      viewDocument: 'Ver documento',
      documentUnavailable: 'Documento no disponible'
    },
    documents: {
      title: 'Documentos',
      subtitle: 'Redacta las plantillas de documento que un registro puede emitir',
      object: 'Objeto',
      pickObject: 'Selecciona un objeto',
      types: 'Tipos',
      newType: 'Nuevo tipo',
      noTypes: 'Este objeto no tiene tipos de documento todavía.',
      pickType: 'Elige un tipo de la izquierda, o crea uno.',
      name: 'Nombre',
      label: 'Etiqueta',
      prefix: 'Sigla',
      prefixHint: 'Mayúsculas y dígitos. Es la SGTM de SGTM-2026-001, y no la puede repetir otro tipo.',
      confirmDelete: '¿Eliminar este tipo de documento?',
      bold: 'Negrita',
      italic: 'Cursiva',
      heading: 'Título',
      list: 'Lista',
      insertField: 'Campo',
      insertValue: 'Valor',
      insertTable: 'Tabla',
      values: {
        today: 'Fecha',
        now: 'Fecha y hora',
        user: 'Usuario',
        id: 'Id del registro',
        documentName: 'Nombre del documento',
        documentPrefix: 'Sigla',
        documentSerial: 'Serie',
        documentNumber: 'Número completo'
      },
      record: {
        title: 'Documentos emitidos',
        chooseType: 'Elige un tipo',
        issue: 'Emitir',
        none: 'Este registro no tiene documentos emitidos todavía.',
        number: 'Número',
        issuedAt: 'Emitido',
        status: 'Estado',
        statuses: { VALID: 'Vigente', ARCHIVED: 'Archivado' }
      },
      print: {
        link: 'Imprimir',
        action: 'Imprimir / Guardar PDF',
        archived: 'ARCHIVADO',
        unavailable: 'Documento no disponible'
      }
    }
  },
  en: {
    nav: { documents: 'Documents' },
    operations: { ISSUE: 'Issue' },
    history: {
      viewDocument: 'View document',
      documentUnavailable: 'Document unavailable'
    },
    documents: {
      title: 'Documents',
      subtitle: 'Write the document templates a record can issue',
      object: 'Object',
      pickObject: 'Pick an object',
      types: 'Types',
      newType: 'New type',
      noTypes: 'This object has no document types yet.',
      pickType: 'Pick a type on the left, or create one.',
      name: 'Name',
      label: 'Label',
      prefix: 'Sigla',
      prefixHint: 'Upper case and digits. It is the SGTM in SGTM-2026-001, and no other type may repeat it.',
      confirmDelete: 'Delete this document type?',
      bold: 'Bold',
      italic: 'Italic',
      heading: 'Heading',
      list: 'List',
      insertField: 'Field',
      insertValue: 'Value',
      insertTable: 'Table',
      values: {
        today: 'Date',
        now: 'Date and time',
        user: 'User',
        id: 'Record id',
        documentName: 'Document name',
        documentPrefix: 'Sigla',
        documentSerial: 'Serial',
        documentNumber: 'Full number'
      },
      record: {
        title: 'Issued documents',
        chooseType: 'Pick a type',
        issue: 'Issue',
        none: 'This record has no issued documents yet.',
        number: 'Number',
        issuedAt: 'Issued',
        status: 'Status',
        statuses: { VALID: 'Valid', ARCHIVED: 'Archived' }
      },
      print: {
        link: 'Print',
        action: 'Print / Save PDF',
        archived: 'ARCHIVED',
        unavailable: 'Document unavailable'
      }
    }
  }
}

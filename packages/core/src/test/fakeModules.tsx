import type { WasichaiModule } from '../registry/contract'

// stand-ins for P5 modules, so core tests exercise every extension point without GIS or documents.

// a section-bound field type, the way gis adds GEOMETRY
export const sketchModule: WasichaiModule = {
  id: 'sketch',
  fieldRenderers: {
    SKETCH: {
      section: 'sketches',
      uniqueAllowed: false,
      input: ({ field, value, onChange }) => (
        <div data-testid="sketch-field">
          <label>{field.label}</label>
          <span>{String(value ?? '')}</span>
          <button type="button" onClick={() => onChange('drawn')}>{`dibujar ${field.name}`}</button>
        </div>
      ),
      settings: {
        defaults: { strokeWidth: '2' },
        editor: ({ settings, onChange }) => (
          <input aria-label="grosor" value={settings.strokeWidth ?? ''} onChange={(event) => onChange({ strokeWidth: event.target.value })} />
        ),
        toPayload: (settings) => ({ strokeWidth: Number(settings.strokeWidth) || 2 })
      }
    }
  }
}

// a page component and an action kind, the way gis adds MAP and workflow adds TRANSITION
export const noteModule: WasichaiModule = {
  id: 'note',
  pageComponents: {
    NOTE: {
      render: ({ component, record }) => <p data-testid="note">{`nota ${component.title ?? ''} ${record.id}`}</p>,
      labelKey: 'note:pageComponents.note'
    }
  },
  pageActions: {
    STAMP: { render: ({ component }) => <button type="button">{`sellar ${component.title ?? ''}`}</button>, labelKey: 'note:pageActions.stamp' }
  }
}

// a module field type with a read-only display component, the way gis or documents would register one
export const annotationModule: WasichaiModule = {
  id: 'annotation',
  fieldRenderers: {
    NOTE_FIELD: {
      section: 'notes',
      input: () => null,
      display: ({ value }) => <span data-testid="note-display">{`nota: ${String(value ?? '')}`}</span>
    }
  }
}

// a history entry body, an audit value and an audit column, the way documents and gis add theirs.
// ISSUE and its strings used to live in core; they moved here with the rest of documents' own turf.
export const issueModule: WasichaiModule = {
  id: 'issue',
  historyRenderers: {
    ISSUE: { body: ({ entry }) => <button type="button">{`Ver documento ${entry.documentId ?? ''}`}</button>, labelKey: 'issue:operations.ISSUE', tone: 'info' }
  },
  auditValueFormatters: [{ matches: (value) => typeof value === 'object' && value !== null && 'strokes' in value, labelKey: 'issue:history.sketchUpdated' }],
  auditFieldLabels: { sketch: 'issue:history.sketch' },
  i18n: {
    es: {
      operations: { ISSUE: 'Emisión' },
      documentIssued: 'Se emitió un documento',
      viewDocument: 'Ver documento',
      documentUnavailable: 'Documento no disponible',
      history: { sketchUpdated: 'boceto actualizado', sketch: 'Boceto' }
    },
    en: {
      operations: { ISSUE: 'Issue' },
      documentIssued: 'A document was issued',
      viewDocument: 'View document',
      documentUnavailable: 'Document unavailable',
      history: { sketchUpdated: 'sketch updated', sketch: 'Sketch' }
    }
  }
}

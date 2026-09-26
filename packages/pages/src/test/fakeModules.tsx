import { MapPin } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'

// a page component with every builder slot filled, the way gis offers MAP
export const pinModule: WasichaiModule = {
  id: 'pin',
  pageComponents: {
    PIN: {
      render: () => <p>chincheta real</p>,
      labelKey: 'pin:label',
      icon: MapPin,
      defaults: { title: 'Chincheta nueva', color: 'rojo' },
      preview: ({ component, definition }) => <div data-testid="pin-preview">{`chincheta ${String(component.color ?? '')} en ${definition.name}`}</div>,
      settings: ({ component, definition, objectName, onChange }) => (
        <label>
          {`color de ${objectName} (${definition.fields.length} campos)`}
          <input aria-label="color" value={String(component.color ?? '')} onChange={(event) => onChange({ color: event.target.value })} />
        </label>
      )
    }
  },
  i18n: { es: { label: 'Chincheta' }, en: { label: 'Pin' } }
}

// an ACTION kind with its own settings and defaults, the way workflow offers TRANSITION
export const stampModule: WasichaiModule = {
  id: 'stamp',
  pageActions: {
    STAMP: {
      render: () => <button type="button">sellar</button>,
      labelKey: 'stamp:label',
      defaults: { style: 'PRIMARY', seal: 'oficial' },
      settings: ({ component, onChange }) => (
        <input aria-label="sello" value={String(component.seal ?? '')} onChange={(event) => onChange({ seal: event.target.value })} />
      )
    }
  },
  i18n: { es: { label: 'Sellar' }, en: { label: 'Stamp' } }
}

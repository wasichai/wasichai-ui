import type { FieldRenderer } from '../../registry/contract'

// the inputs a module type adds to the field form (gis: its shape kind and reference system).
// nothing for core types.
export function ModuleFieldSettings({
  renderer,
  settings,
  onChange
}: {
  renderer?: FieldRenderer
  settings: Record<string, string>
  onChange: (settings: Record<string, string>) => void
}) {
  const Editor = renderer?.settings?.editor
  return Editor ? <Editor settings={settings} onChange={(patch) => onChange({ ...settings, ...patch })} /> : null
}

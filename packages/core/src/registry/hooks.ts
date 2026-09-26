import { useRegistry } from '../app/context'

// what every module knows about one object, merged. the registry fixes how many hooks run, so the
// rules of hooks hold.
export function useObjectFlags(objectName: string): Record<string, boolean> {
  const registry = useRegistry()
  const flags: Record<string, boolean> = {}
  for (const useFlags of registry.objectFlags) Object.assign(flags, useFlags(objectName))
  return flags
}

import { useQueryClient } from '@tanstack/react-query'
import { useRegistry } from '../app/context'

// modules cache per-object data of their own (gis: features). a record or field write makes it
// stale; core does not know those keys, each module lists its own.
export function useModuleQueryInvalidation(): (objectName: string) => void {
  const queryClient = useQueryClient()
  const registry = useRegistry()
  return (objectName: string) => {
    for (const keysOf of registry.recordQueryKeys) {
      for (const queryKey of keysOf(objectName)) void queryClient.invalidateQueries({ queryKey })
    }
  }
}

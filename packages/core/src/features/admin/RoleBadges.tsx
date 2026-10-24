import { Badge } from '@wasichai/ui'
import type { Role } from './types'

// a user or an account holds role names; show each role's label, the code stays in the title.
// a name the role list does not know (not loaded yet, or gone) shows as itself
export function RoleBadges({ names, roles, empty }: { names: string[]; roles: Role[]; empty: string }) {
  if (names.length === 0) return <span className="text-xs text-ink-muted">{empty}</span>
  const labels = new Map(roles.map((role) => [role.name, role.label || role.name]))
  return (
    <span className="flex flex-wrap gap-1">
      {names.map((name) => (
        <Badge key={name} title={name}>
          {labels.get(name) ?? name}
        </Badge>
      ))}
    </span>
  )
}

import { Link } from 'react-router'
import { Button } from '@wasichai/ui'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import type { PageComponent } from '../../types/metadata'

interface ActionButtonProps {
  component: PageComponent
  objectName: string
  recordId: string
}

// one button an admin placed where they wanted it. NAVIGATE is core's; any other kind (workflow:
// TRANSITION) is drawn by the module that registered it, and nothing is drawn when none did.
export function ActionButton({ component, objectName, recordId }: ActionButtonProps) {
  const { pageActions } = useRegistry()
  if (component.action === 'NAVIGATE') return <NavigateAction component={component} />
  const definition = component.action ? pageActions[component.action] : undefined
  const ModuleAction = definition?.render
  return ModuleAction ? <ModuleAction component={component} objectName={objectName} recordId={recordId} /> : null
}

// a Link when it stays inside the app, a plain anchor when it leaves it
function NavigateAction({ component }: { component: PageComponent }) {
  const links = useWasichaiLinks()
  const label = component.title ?? component.target ?? component.url ?? ''

  if (component.url) {
    return (
      <a
        href={component.url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
      >
        {label}
      </a>
    )
  }

  return (
    <Button asChild>
      {/* a target that went missing opens the object list instead of a url with a hole in it */}
      <Link to={component.target ? links.records(component.target) : links.objects()}>{label}</Link>
    </Button>
  )
}

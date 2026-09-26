import { Children, cloneElement, createContext, isValidElement, useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'

// native stand-ins for the two radix primitives jsdom cannot drive (portal, pointer capture). tests
// spread them over the real module: vi.mock('@wasichai/ui', async (orig) => ({ ...(await orig()), ...(await import('…/uiDoubles')) }))

export function SelectTrigger({ children }: { children?: ReactNode; 'aria-label'?: string }) {
  return <>{children}</>
}

export const SelectValue = () => null

export function SelectContent({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children?: ReactNode }) {
  return <option value={value}>{children}</option>
}

export function Select({
  value,
  disabled,
  onValueChange,
  children
}: {
  value: string
  disabled?: boolean
  onValueChange: (value: string) => void
  children?: ReactNode
}) {
  return (
    <select aria-label={triggerLabel(children)} value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>
      <option value="" />
      {children}
    </select>
  )
}

// the accessible name lives on the trigger, which this double renders away
function triggerLabel(children: ReactNode): string | undefined {
  const trigger = Children.toArray(children).find((child) => isValidElement(child) && child.type === SelectTrigger)
  return isValidElement(trigger) ? (trigger.props as { 'aria-label'?: string })['aria-label'] : undefined
}

const DialogContext = createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({ open: false, onOpenChange: () => {} })

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children?: ReactNode }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children }: { children: ReactElement }) {
  const { onOpenChange } = useContext(DialogContext)
  return cloneElement(children, { onClick: () => onOpenChange(true) } as Record<string, unknown>)
}

// role="dialog" like the real primitive: the canvas stays mounted behind it, tests scope into it
export function DialogContent({ children }: { children?: ReactNode }) {
  const { open } = useContext(DialogContext)
  return open ? <div role="dialog">{children}</div> : null
}

export function DialogTitle({ children }: { children?: ReactNode }) {
  return <h2>{children}</h2>
}

export function DialogDescription({ children }: { children?: ReactNode }) {
  return <p>{children}</p>
}

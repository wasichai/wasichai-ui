import { Children, isValidElement, type ReactNode } from 'react'

// radix opens its listbox in a portal behind pointer capture jsdom does not implement. a native
// select answers the same question: which value did the page receive.
export const SelectTrigger = ({ children }: { children?: ReactNode; 'aria-label'?: string }) => <>{children}</>
export const SelectValue = (_: { placeholder?: string }) => null
export const SelectContent = ({ children }: { children?: ReactNode }) => <>{children}</>
export const SelectItem = ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>

// the accessible name lives on the trigger, which this double renders away
function triggerLabel(children: ReactNode): string | undefined {
  const trigger = Children.toArray(children).find((child) => isValidElement(child) && child.type === SelectTrigger)
  return isValidElement(trigger) ? (trigger.props as { 'aria-label'?: string })['aria-label'] : undefined
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

import { useState } from 'react'

// a dialog mounted open has no Radix trigger: on close Radix has nowhere to send focus and it drops to <body> (#134).
// this remembers what had focus when it mounted and sends focus back there, or to the caller's target if that element
// is gone (the row it acted on was deleted). pass the result as DialogContent's onCloseAutoFocus
export function useReturnFocus(returnFocusTo?: () => HTMLElement | null | undefined) {
  // first render: Radix moves focus in an effect, after this
  const [opener] = useState(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)))
  return (event: Event) => {
    event.preventDefault()
    const target = opener && opener !== document.body && opener.isConnected ? opener : returnFocusTo?.()
    target?.focus()
  }
}

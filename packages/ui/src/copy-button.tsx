import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './button'

export interface CopyButtonProps {
  value: string
  // accessible name; the package has no i18n, the caller translates
  label: string
  // said for a moment once the value is on the clipboard
  copiedLabel: string
  className?: string
}

// an icon button that puts `value` on the clipboard and shows a check for a moment
export function CopyButton({ value, label, copiedLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    // undefined outside a secure context
    if (!navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="copy-button"
      className={className}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      onClick={() => void copy()}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

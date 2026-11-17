import { BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@wasichai/ui'

const HOUR = 60 * 60 * 1000

// computed on click, so "one hour" is an hour from the choice and not from the render
const OPTIONS = {
  hour: () => new Date(Date.now() + HOUR),
  tomorrow: () => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(8, 0, 0, 0)
    return date
  },
  week: () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date
  }
}

export function SnoozeMenu({ onSnooze, disabled }: { onSnooze: (until: string) => void; disabled?: boolean }) {
  const { t } = useTranslation('notifications')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <BellOff className="size-4" aria-hidden />
          {t('notifications.inbox.snooze')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((key) => (
          <DropdownMenuItem key={key} onSelect={() => onSnooze(OPTIONS[key]().toISOString())}>
            {t(`notifications.inbox.snoozeOptions.${key}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

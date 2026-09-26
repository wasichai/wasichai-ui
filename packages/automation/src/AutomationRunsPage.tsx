import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@wasichai/core'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useRecentRuns } from './api'
import { RunTable } from './RunTable'
import type { RunStatus } from './types'

const STATUSES: RunStatus[] = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED']
const LIMITS = [25, 50, 100, 200]
// radix selects refuse an empty value, so "no filter" needs a sentinel
const ANY = '__any__'

// every rule of the organization in one list. filtering happens here: the server sends the
// tail of the log and the admin narrows it down.
export function AutomationRunsPage() {
  const { t } = useTranslation(['automation', 'common'])
  const [status, setStatus] = useState(ANY)
  const [limit, setLimit] = useState(100)
  const { data = [], isLoading } = useRecentRuns(limit)
  const runs = status === ANY ? data : data.filter((run) => run.status === status)

  return (
    <>
      <PageHeader title={t('automations.runsTitle')} subtitle={t('automations.runsSubtitle')} />
      <div className="space-y-5 p-8">
        <Card>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="runs-status">{t('automations.status')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="runs-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{t('automations.allRules')}</SelectItem>
                    {STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`automations.statuses.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="runs-limit">{t('automations.runsTitle')}</Label>
                <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                  <SelectTrigger id="runs-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMITS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('automations.runsTitle')}</CardTitle>
          </CardHeader>
          <CardBody>{isLoading ? <p className="text-sm text-ink-muted">{t('common.loading')}</p> : <RunTable runs={runs} showRule />}</CardBody>
        </Card>
      </div>
    </>
  )
}

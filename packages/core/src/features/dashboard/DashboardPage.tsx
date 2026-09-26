import { Boxes } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Card, CardBody } from '@wasichai/ui'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import { useObjects } from '../../queries'
import { PageHeader } from '../../shell/PageHeader'

export function DashboardPage() {
  const { t } = useTranslation()
  const links = useWasichaiLinks()
  const { dashboardCards, objectTileDetails } = useRegistry()
  const { data: objects = [], isLoading } = useObjects()

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.welcome')} />
      <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-ink-muted">
              <Boxes className="h-4 w-4" />
              <span className="text-sm">{t('dashboard.objects')}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold text-ink">{isLoading ? '—' : objects.length}</p>
          </CardBody>
        </Card>
        {dashboardCards.map((DashboardCard, index) => (
          <DashboardCard key={index} objects={objects} loading={isLoading} />
        ))}
      </div>

      <div className="grid gap-3 px-8 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {objects.map((item) => (
          <Link
            key={item.id}
            to={links.records(item.name)}
            className="rounded-card border border-border bg-surface px-5 py-4 transition-colors hover:border-brand"
          >
            <p className="font-medium text-ink">{item.pluralLabel}</p>
            {objectTileDetails.map((Detail, index) => (
              <Detail key={index} object={item} />
            ))}
          </Link>
        ))}
      </div>
    </>
  )
}

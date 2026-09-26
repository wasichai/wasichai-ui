import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Button } from '@wasichai/ui'
import { Card } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { useObjects } from '../../queries'
import { useWasichaiLinks, useRegistry } from '../../app/context'

export function ObjectsPage() {
  const { t } = useTranslation()
  const { data: objects = [], isLoading } = useObjects()
  const links = useWasichaiLinks()
  const { objectColumns } = useRegistry()

  return (
    <>
      <PageHeader
        title={t('objects.title')}
        subtitle={t('objects.subtitle')}
        actions={
          <Button asChild>
            <Link to={links.newObject()}>
              <Plus className="h-4 w-4" />
              {t('objects.new')}
            </Link>
          </Button>
        }
      />

      <div className="p-8">
        <Card>
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : objects.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('objects.empty')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('objects.label')}</Th>
                  <Th>{t('objects.name')}</Th>
                  {objectColumns.map((column) => (
                    <Th key={column.id}>{t(column.headerKey)}</Th>
                  ))}
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {objects.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted">
                    <Td className="font-medium">
                      {item.label}
                      {item.enabled ? null : <Badge className="ml-2 bg-ink-muted/15 text-ink-muted">{t('objects.disabled')}</Badge>}
                    </Td>
                    <Td className="font-mono text-xs text-ink-muted">{item.name}</Td>
                    {objectColumns.map((column) => (
                      <Td key={column.id}>
                        <column.cell object={item} />
                      </Td>
                    ))}
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" asChild>
                          <Link to={links.records(item.name)}>{t('objects.openRecords')}</Link>
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`${t('common.edit')} ${item.name}`} asChild>
                          <Link to={links.editObject(item.name)}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}

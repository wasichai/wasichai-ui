import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Map as MapIcon, Trash2 } from 'lucide-react'
import { PageHeader, describeError, useObjects, useWasichaiLinks } from '@wasichai/core'
import { Button, Card, ConfirmDialog, Table, Td, Th } from '@wasichai/ui'
import { useDeleteMapView, useMapViews } from './api'
import type { MapViewRecord } from './types'

// the saved maps. a row opens the map page on its view; editing happens there.
export function MapViewsPage() {
  const { t } = useTranslation(['gis', 'common'])
  const links = useWasichaiLinks()
  const views = useMapViews()
  const { data: objects = [] } = useObjects()
  const remove = useDeleteMapView()
  const [deleting, setDeleting] = useState<MapViewRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const objectLabel = (name: string) => objects.find((item) => item.name === name)?.pluralLabel ?? name
  const rows = views.data ?? []

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync({ objectName: deleting.objectName, name: deleting.name })
      setDeleting(null)
      setError(null)
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  return (
    <>
      <PageHeader title={t('mapViews.title')} subtitle={t('mapViews.subtitle')} />
      <div className="p-8">
        <Card>
          {views.isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : views.isError ? (
            <p role="alert" className="px-5 py-8 text-sm text-danger">
              {describeError(views.error)}
            </p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('mapViews.empty')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('mapViews.label')}</Th>
                  <Th>{t('mapViews.object')}</Th>
                  <Th>{t('mapViews.geometry')}</Th>
                  <Th>{t('mapViews.style')}</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {rows.map((view) => (
                  <tr key={view.id}>
                    <Td className="font-medium">
                      {view.label}
                      <span className="ml-2 font-mono text-xs text-ink-muted">{view.name}</span>
                    </Td>
                    <Td>{objectLabel(view.objectName)}</Td>
                    <Td className="font-mono text-xs">{view.geometryName}</Td>
                    <Td className="text-xs">
                      {view.style
                        ? `${view.style.by} · ${t(`style.${view.style.type}`)}${view.style.classes ? ` (${view.style.classes})` : ''}`
                        : t('mapViews.unstyled')}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" asChild>
                          <Link to={links.to('gis:map', {}, { object: view.objectName, view: view.name })}>
                            <MapIcon className="h-4 w-4" />
                            {t('mapViews.open')}
                          </Link>
                        </Button>
                        <Button variant="secondary" aria-label={t('mapViews.delete')} onClick={() => setDeleting(view)}>
                          <Trash2 className="h-4 w-4" />
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
      {deleting ? (
        <ConfirmDialog
          title={t('mapViews.delete')}
          description={t('mapViews.confirmDelete')}
          busy={remove.isPending}
          error={error}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null)
            setError(null)
          }}
        />
      ) : null}
    </>
  )
}

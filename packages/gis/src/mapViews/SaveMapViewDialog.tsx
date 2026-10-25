import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Label } from '@wasichai/ui'
import { describeError } from '@wasichai/core'
import type { AttributeStyle } from '../lib/style'
import { useMapViews, useSaveMapView } from './api'
import type { MapViewRecord } from './types'

export interface SaveMapViewDialogProps {
  objectName: string
  geometryName: string
  style: AttributeStyle | null
  // the view the map was opened from: its name and label come prefilled
  initial?: { name: string; label: string }
  onSaved: (view: MapViewRecord) => void
  onCancel: () => void
}

// the same names the server takes for a list view or a map view
const VALID_NAME = /^[a-z][a-z0-9_-]{0,48}$/

// mounted open, like ConfirmDialog: the caller renders it only while asking
export function SaveMapViewDialog({ objectName, geometryName, style, initial, onSaved, onCancel }: SaveMapViewDialogProps) {
  const { t } = useTranslation(['gis', 'common'])
  const [name, setName] = useState(initial?.name ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [error, setError] = useState<string | null>(null)
  const views = useMapViews()
  const save = useSaveMapView(objectName)
  const trimmed = name.trim().toLowerCase()
  const exists = (views.data ?? []).some((view) => view.objectName === objectName && view.name === trimmed)

  const confirm = async () => {
    if (!VALID_NAME.test(trimmed)) {
      setError(t('mapViews.nameHint'))
      return
    }
    setError(null)
    try {
      onSaved(await save.mutateAsync({ view: { name: trimmed, label: label.trim(), geometryName, style }, exists }))
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-semibold">{t('mapViews.saveTitle')}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-ink-muted">{t('mapViews.subtitle')}</DialogDescription>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="map-view-name">{t('mapViews.name')}</Label>
            <Input id="map-view-name" value={name} onChange={(event) => setName(event.target.value)} />
            <span className="text-xs text-ink-muted">{exists ? t('mapViews.overwrite') : t('mapViews.nameHint')}</span>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="map-view-label">{t('mapViews.label')}</Label>
            <Input id="map-view-label" value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={save.isPending} onClick={confirm}>
            {t('mapViews.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

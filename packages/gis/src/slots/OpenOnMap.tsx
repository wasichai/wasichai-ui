import { Map as MapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useWasichaiLinks, type RecordListActionProps } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { objectGeometry } from '../types'

export function OpenOnMap({ objectName, definition }: RecordListActionProps) {
  const { t } = useTranslation(['gis', 'common'])
  const links = useWasichaiLinks()
  if (!objectGeometry(definition)) return null
  return (
    <Button variant="secondary" asChild>
      <Link to={links.to('gis:map', {}, { object: objectName })}>
        <MapIcon className="h-4 w-4" />
        {t('map.title')}
      </Link>
    </Button>
  )
}

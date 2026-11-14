import { useParams } from 'react-router'
import { useWasichaiLinks } from '../../app/context'

// route keys of the app's own module ('lms:lessons') the record screens link to, in place of core's
// record routes. each is filled with the current route's params, the object (:object) and the record (:id)
export interface RecordRoutes {
  // the list: where the detail's back button goes
  records: string
  // one record: where a row opens and a saved form lands. its pattern names the record :id
  record: string
  // the create form. absent: the list offers no create, there is nowhere to make one
  newRecord?: string
}

// what RecordListPage, RecordDetailPage and RecordFormPage take. each one absent: as before, the
// route's params and core's /data/objects/... links
export interface RecordScreenProps {
  // absent = the route's :object
  objectName?: string
  routes?: RecordRoutes
  // no create, edit, delete, link or unlink, whatever the user may do. the server still decides
  readOnly?: boolean
}

// the record links of WasichaiLinks, with nowhere to create when the app's routes have no form
export interface RecordLinks {
  records(object: string): string
  newRecord(object: string): string | null
  record(object: string, id: string): string
}

// links between list, detail and form stay inside the module that mounts them
export function useRecordLinks(routes: RecordRoutes | undefined): RecordLinks {
  const links = useWasichaiLinks()
  const params = useParams()
  if (!routes) return links
  // a nested route (courses/:course/lessons/:id) keeps the params it is under
  const fill = (object: string, id?: string) => {
    const filled: Record<string, string> = {}
    for (const [name, value] of Object.entries(params)) if (value !== undefined) filled[name] = value
    return { ...filled, object, ...(id === undefined ? {} : { id }) }
  }
  return {
    records: (object) => links.to(routes.records, fill(object)),
    newRecord: (object) => (routes.newRecord ? links.to(routes.newRecord, fill(object)) : null),
    record: (object, id) => links.to(routes.record, fill(object, id))
  }
}

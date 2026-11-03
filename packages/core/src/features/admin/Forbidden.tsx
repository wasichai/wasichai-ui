import { ApiError } from '../../api/client'
import { ErrorState } from '../../components/query-state/QueryState'
import { PageHeader } from '../../shell/PageHeader'

// a 403 on the list is no empty list: the caller may not see the screen at all (#139)
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

// the whole screen when its list answers 403: no forms the server would refuse anyway
export function AdminForbidden({ title, subtitle, error }: { title: string; subtitle?: string; error: unknown }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="p-8">
        <ErrorState error={error} />
      </div>
    </>
  )
}

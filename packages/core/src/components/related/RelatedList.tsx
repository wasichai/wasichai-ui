import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Unlink } from 'lucide-react'
import { Alert, Button } from '@wasichai/ui'
import { Card, CardHeader, CardTitle } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useWasichaiLinks, useRegistry } from '../../app/context'
import { describeError } from '../../api/client'
import { useWritePolicy } from '../../lib/writePolicy'
import { FieldCell } from '../field-value'
import { reasonRefusal, useReasonPrompt } from '../reason/useReasonPrompt'
import { WritePolicyNotice } from '../reason/WritePolicyNotice'
import { useLinkRelated, useObjectDefinition, useRecords, useRelatedRecords } from '../../queries'
import type { RelatedSide } from '../../types/metadata'

interface RelatedListProps {
  objectName: string
  recordId: string
  side: RelatedSide
}

// one related list per relationship the object takes part in, columns from the other object.
export function RelatedList({ objectName, recordId, side }: RelatedListProps) {
  const { t } = useTranslation()
  const links = useWasichaiLinks()
  const { fieldRenderers } = useRegistry()
  const definition = useObjectDefinition(side.objectName)
  const related = useRelatedRecords(objectName, recordId, side.relationship)
  const { link, unlink } = useLinkRelated(objectName, recordId, side.relationship)
  const columns = (definition.data?.fields ?? []).filter((field) => field.visible).slice(0, 4)
  const manyToMany = side.type === 'MANY_TO_MANY'
  // a link writes both ends: either one's rules hold
  const policy = useWritePolicy(objectName, side.objectName)
  const prompt = useReasonPrompt()
  const linkable = manyToMany && policy.canLink
  // the last link or unlink the server refused says why; the next attempt clears it.
  // a refused reason is said in the open dialog, once
  const lastError = link.error ?? unlink.error
  const refused = prompt.dialog && reasonRefusal(lastError) !== undefined ? null : lastError

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>{side.label}</CardTitle>
          <Badge>{side.type}</Badge>
          <span className="text-xs text-ink-muted">{related.data?.totalElements ?? 0}</span>
        </div>
        {linkable ? (
          <LinkPicker
            side={side}
            // until both ends' rules arrive a link could skip the reason
            pending={link.isPending || !policy.loaded}
            onLink={(otherId, done) =>
              // reset inside the write: a cancelled prompt leaves the last refusal on screen
              prompt.withReason(
                (reason) => {
                  unlink.reset()
                  return link.mutateAsync({ otherId, reason }).then(done)
                },
                { required: policy.requiresReason, title: t('relationships.link'), confirmLabel: t('relationships.link') }
              )
            }
          />
        ) : null}
      </CardHeader>

      {manyToMany ? <WritePolicyNotice policy={policy} scope="link" className="border-b border-border px-5 py-3" /> : null}

      {refused ? (
        <Alert
          tone="danger"
          className="border-b border-border bg-danger-soft px-5 py-3"
          onDismiss={() => {
            link.reset()
            unlink.reset()
          }}
        >
          {describeError(refused)}
        </Alert>
      ) : null}

      {related.isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-muted">{t('common.loading')}</p>
      ) : (related.data?.content.length ?? 0) === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">{t('common.empty')}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              {columns.map((field) => (
                <Th key={field.id}>{field.label}</Th>
              ))}
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {related.data?.content.map((record) => (
              <tr key={record.id} className="hover:bg-surface-muted">
                {columns.map((field) => (
                  <Td key={field.id}>
                    <FieldCell field={field} record={record} fieldRenderers={fieldRenderers} />
                  </Td>
                ))}
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={links.record(side.objectName, record.id)}>{t('common.edit')}</Link>
                    </Button>
                    {linkable ? (
                      <UnlinkButton
                        disabled={unlink.isPending || !policy.loaded}
                        onUnlink={() =>
                          prompt.withReason(
                            (reason) => {
                              link.reset()
                              return unlink.mutateAsync({ otherId: record.id, reason })
                            },
                            { required: policy.requiresReason, title: t('relationships.unlink'), confirmLabel: t('relationships.unlink') }
                          )
                        }
                      />
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {prompt.dialog}
    </Card>
  )
}

// done: the pick is kept until the link holds, so a refused one can be tried again
function LinkPicker({ side, pending, onLink }: { side: RelatedSide; pending: boolean; onLink: (otherId: string, done: () => void) => void }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState('')
  const candidates = useRecords(side.objectName, { size: '100' })
  const definition = useObjectDefinition(side.objectName)
  const labelField = definition.data?.fields.find((field) => ['TEXT', 'EMAIL', 'URL', 'ENUM'].includes(field.type))?.name

  return (
    <div className="flex items-center gap-2">
      <div className="w-48">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder={t('relationships.pick')} />
          </SelectTrigger>
          <SelectContent>
            {(candidates.data?.content ?? []).map((record) => (
              <SelectItem key={record.id} value={record.id}>
                {String((labelField && record.attributes[labelField]) ?? record.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" variant="secondary" disabled={!selected || pending} onClick={() => onLink(selected, () => setSelected(''))}>
        {t('relationships.link')}
      </Button>
    </div>
  )
}

function UnlinkButton({ disabled, onUnlink }: { disabled: boolean; onUnlink: () => void }) {
  const { t } = useTranslation()
  return (
    <Button variant="ghost" size="icon" aria-label={t('relationships.unlink')} disabled={disabled} onClick={onUnlink}>
      <Unlink className="h-4 w-4" />
    </Button>
  )
}

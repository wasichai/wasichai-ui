import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Badge } from '@wasichai/ui'
import { describeError } from '@wasichai/core'
import { useDeletePage, useForms, useObjectDefinition, useObjectRelationships, useObjects, useResolvedPage, useSavePage } from '@wasichai/core'
import type { Page, PageLayout } from '@wasichai/core'
import { Canvas } from './builder/Canvas'
import { DndProvider } from './builder/DndProvider'
import { Inspector } from './builder/Inspector'
import { Palette } from './builder/Palette'
import { toDefinition, withIds } from './builder/pageTree'
import type { Node } from './builder/pageTree'
import { TemplateDialog } from './builder/TemplateDialog'
import { TemplatePreview } from './builder/preview/TemplatePreview'

// depth-first search by uid: the tree canvas hands back uids, never index paths
function findNode(tree: Node[], uid: string): Node | null {
  for (const node of tree) {
    if (node.uid === uid) return node
    const found = findNode(node.children, uid)
    if (found) return found
  }
  return null
}

// the inspector patches one node wherever it sits; everything else is passed through untouched.
// narrowing a container to single-column while a child still sits in column 2 is exactly the tree
// the server refuses to save, so clamp the children the moment the layout that held them shrinks.
function patchNode(tree: Node[], uid: string, patch: Partial<Node>): Node[] {
  return tree.map((node) => {
    if (node.uid !== uid) return { ...node, children: patchNode(node.children, uid, patch) }
    const next = { ...node, ...patch }
    if (patch.layout === 'single-column') {
      next.children = next.children.map((child) => (child.column > 1 ? { ...child, column: 1 } : child))
    }
    return next
  })
}

// the layout of whatever contains uid: its parent container's own layout, or the page's own
// layout when uid sits at the root. non-null strings are truthy, so `found` distinguishes "not
// found yet" from "found, and its ancestor has no layout" -- which cannot happen, but keeps the
// recursion honest.
function parentLayoutOf(tree: Node[], uid: string, ancestorLayout: PageLayout): PageLayout | null {
  for (const node of tree) {
    if (node.uid === uid) return ancestorLayout
    const found = parentLayoutOf(node.children, uid, node.layout)
    if (found) return found
  }
  return null
}

// the page and its regions are the template's, not the admin's: refuse to delete them however the
// ask arrives. the inspector already hides the bin for a region -- this is the guard for the next
// caller, which will not remember to.
export function removeNode(tree: Node[], uid: string): Node[] {
  return tree
    .filter((node) => node.uid !== uid || node.type === 'PAGE' || node.type === 'REGION')
    .map((node) => ({ ...node, children: removeNode(node.children, uid) }))
}

// drag-and-drop page builder: palette feeds the canvas, canvas feeds the inspector, all three
// share one client-side tree of ided nodes until save strips the ids back out for the wire.
export function PageBuilderPage() {
  const { t } = useTranslation(['pages', 'common'])
  const { data: objects = [] } = useObjects()
  const [objectName, setObjectName] = useState('')
  const page = useResolvedPage(objectName || undefined)
  const definition = useObjectDefinition(objectName || undefined)
  const relationships = useObjectRelationships(objectName || undefined)
  const forms = useForms(objectName || undefined)
  const save = useSavePage()
  const remove = useDeletePage()
  const [draft, setDraft] = useState<Page | null>(null)
  const [tree, setTree] = useState<Node[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // the server is the source of truth: reload the draft and the tree whenever it answers again.
  // the tree is still Node[], but it only ever holds one root now: the page's own PAGE node.
  useEffect(() => {
    setDraft(page.data ?? null)
    setTree(page.data ? withIds([page.data.definition.page]) : [])
    setSelected(null)
    setError(null)
  }, [page.data])

  const submit = async () => {
    if (!draft) return
    setError(null)
    try {
      await save.mutateAsync({
        generated: draft.generated,
        page: {
          objectName: draft.objectName,
          name: draft.name,
          label: draft.label,
          kind: draft.kind,
          template: draft.template.name,
          definition: { page: toDefinition(tree)[0] }
        }
      })
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  const reset = async () => {
    if (!draft || draft.generated) return
    if (!window.confirm(t('pages.confirmReset'))) return
    setError(null)
    try {
      await remove.mutateAsync({ name: draft.name, objectName: draft.objectName })
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  // the page has no layout of its own any more (its top level is the template's rows); the
  // closest thing left is the root PAGE node's own layout field, which parentLayoutOf treats
  // as "whatever contains the root" for a node that turns out to sit directly under it.
  const rootLayout: PageLayout = tree[0]?.layout ?? 'single-column'

  return (
    <>
      <PageHeader title={t('pages.title')} subtitle={t('pages.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardBody>
            <div className="max-w-sm space-y-1.5">
              <Label>{t('pages.object')}</Label>
              <Select value={objectName} onValueChange={setObjectName}>
                <SelectTrigger>
                  <SelectValue placeholder={t('map.selectObject')} />
                </SelectTrigger>
                <SelectContent>
                  {objects.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardBody>
        </Card>

        {!objectName ? null : page.isLoading || !draft ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : !definition.data ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle>{draft.name}</CardTitle>
                  <Badge>{draft.generated ? t('pages.generated') : t('pages.stored')}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!draft.generated ? (
                    <Button variant="secondary" onClick={() => void reset()} disabled={remove.isPending}>
                      <RotateCcw className="h-4 w-4" />
                      {t('pages.reset')}
                    </Button>
                  ) : null}
                  <Button onClick={() => void submit()} disabled={save.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {draft.generated ? <p className="text-sm text-ink-muted">{t('pages.generatedHint')}</p> : null}
                {error ? (
                  <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center gap-4">
                  <TemplatePreview template={draft.template} className="w-24 shrink-0" />
                  <div className="space-y-1">
                    <Label>{t('pages.template')}</Label>
                    <p className="text-sm text-ink">{t(`pages.templates.${draft.template.name}.label`)}</p>
                  </div>
                  <TemplateDialog
                    current={draft.template}
                    tree={tree}
                    onApply={(template, next) => {
                      setTree(next)
                      setDraft({ ...draft, template })
                    }}
                  />
                </div>

                <div className="max-w-sm space-y-1.5">
                  <Label htmlFor="page-label">{t('pages.label')}</Label>
                  <Input id="page-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
                </div>
              </CardBody>
            </Card>

            <DndProvider tree={tree} onChange={setTree}>
              <div className="grid gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-2">
                  <Palette definition={definition.data} />
                </Card>

                <Card className="lg:col-span-7">
                  <CardHeader>
                    <CardTitle>{t('pages.canvas')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Canvas
                      tree={tree}
                      template={draft.template}
                      selected={selected}
                      onSelect={setSelected}
                      definition={definition.data}
                      sides={relationships.data ?? []}
                    />
                  </CardBody>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>{t('pages.inspector')}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Inspector
                      node={selected ? findNode(tree, selected) : null}
                      parentLayout={selected ? (parentLayoutOf(tree, selected, rootLayout) ?? rootLayout) : rootLayout}
                      definition={definition.data}
                      sides={relationships.data ?? []}
                      forms={forms.data ?? []}
                      objectName={objectName}
                      objects={objects.map((item) => item.name)}
                      onPatch={(uid, patch) => setTree((current) => patchNode(current, uid, patch))}
                      onRemove={(uid) => {
                        setTree((current) => removeNode(current, uid))
                        setSelected((current) => (current === uid ? null : current))
                      }}
                    />
                  </CardBody>
                </Card>
              </div>
            </DndProvider>
          </>
        )}
      </div>
    </>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@wasichai/ui'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useTemplates } from '@wasichai/core'
import { cn } from '@wasichai/ui'
import type { PageTemplate } from '@wasichai/core'
import type { Node } from './pageTree'
import { TemplatePreview } from './preview/TemplatePreview'
import { orphans, retemplate } from './retemplate'
import { regionKeys } from '@wasichai/core'

export interface TemplateDialogProps {
  current: PageTemplate
  tree: Node[]
  // called once, with the already-rebuilt tree -- this is a draft edit like a drag, not a save
  onApply: (template: PageTemplate, next: Node[]) => void
}

// every destination pre-filled with the first surviving region. radix's Select does not fire
// onValueChange for a re-pick of the value already shown, so an admin who agrees with the
// default and clicks Apply must already have a full `moves` -- an empty one is a silent refusal
// inside retemplate(). same trap Canvas.blank() works around for a fresh ACTION's kind.
function preselect(target: PageTemplate, tree: Node[]): Record<string, string> {
  const survivor = regionKeys(target)[0]
  const moves: Record<string, string> = {}
  orphans(tree, target).forEach((orphan) => {
    moves[orphan.region] = survivor
  })
  return moves
}

// two steps: pick a template, then say where any dying region's children go. the trigger sits
// above DndProvider in PageBuilderPage, so nothing in here may ever render a draggable -- a
// useDraggable with no DndContext around it is the exact defect this branch shipped once.
export function TemplateDialog({ current, tree, onApply }: TemplateDialogProps) {
  const { t } = useTranslation(['pages', 'common'])
  const { data: templates = [] } = useTemplates()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [picked, setPicked] = useState<PageTemplate>(current)
  const [moves, setMoves] = useState<Record<string, string>>(() => preselect(current, tree))

  // a fresh run every time the dialog opens -- otherwise a previous run's picks leak into this one
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setStep(1)
      setPicked(current)
      setMoves(preselect(current, tree))
    }
  }

  const choose = (template: PageTemplate) => {
    setPicked(template)
    setMoves(preselect(template, tree))
  }

  const pending = orphans(tree, picked)
  const survivors = regionKeys(picked)

  const apply = () => {
    // retemplate() refuses by handing the tree back unchanged. applying anyway would set the new
    // template while the old regions stay on the tree -- the canvas finds none of them and goes
    // blank. latent today (preselect always covers what pending reports), guarded anyway.
    const next = retemplate(tree, picked, moves)
    if (next === tree && pending.length > 0) return
    onApply(picked, next)
    setOpen(false)
  }

  const footer = () => {
    if (step === 1 && pending.length > 0) setStep(2)
    else apply()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          {t('pages.changeTemplate')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        {/* step 2 asks the one question in this flow that can lose the admin's work -- the
            header has to say so, not still describe step 1's "pick a template" screen. */}
        <DialogTitle>{t(step === 1 ? 'pages.templatePicker.title' : 'pages.templatePicker.moveTitle')}</DialogTitle>
        <DialogDescription>{t(step === 1 ? 'pages.templatePicker.hint' : 'pages.templatePicker.moveHint')}</DialogDescription>

        {step === 1 ? (
          <div className="grid gap-4 py-4 md:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              {templates.map((template) => (
                // NO draggable inside a dialog, ever: the trigger above sits outside DndProvider,
                // so a draggable here would register with no DndContext, invisible to a green suite.
                <button
                  key={template.name}
                  type="button"
                  aria-pressed={picked.name === template.name}
                  onClick={() => choose(template)}
                  className={cn('w-full rounded-md border p-2 text-left', picked.name === template.name ? 'border-brand bg-brand-soft' : 'border-border')}
                >
                  {/* TemplatePreview renders no focusable element -- a focusable inside a button is invalid html */}
                  <TemplatePreview template={template} />
                  <span className="mt-1 block truncate text-xs text-ink">{t(`pages.templates.${template.name}.label`)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <TemplatePreview template={picked} labels />
              <p className="text-sm text-ink-muted">{t(`pages.templates.${picked.name}.description`)}</p>
              <p className="text-xs text-ink-muted">
                {t('pages.templatePicker.regions')}: {survivors.map((region) => t(`pages.regions.${region}`)).join(', ')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {pending.map((orphan) => (
              <div key={orphan.region} className="grid items-center gap-4 rounded-md border border-border p-3 md:grid-cols-[1fr_160px]">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-ink">{t(`pages.regions.${orphan.region}`)}</p>
                  <p className="text-xs text-ink-muted">{t('pages.templatePicker.moveCount', { count: orphan.count })}</p>
                  <Label htmlFor={`move-${orphan.region}`}>{t('pages.templatePicker.moveTo')}</Label>
                  <Select value={moves[orphan.region] ?? ''} onValueChange={(value) => setMoves((current) => ({ ...current, [orphan.region]: value }))}>
                    <SelectTrigger id={`move-${orphan.region}`} aria-label={t('pages.templatePicker.moveTo')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {survivors.map((region) => (
                        <SelectItem key={region} value={region}>
                          {t(`pages.regions.${region}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <TemplatePreview template={picked} highlight={moves[orphan.region]} />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {step === 2 ? (
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              {t('pages.templatePicker.back')}
            </Button>
          ) : null}
          <Button type="button" onClick={footer}>
            {step === 2 || pending.length === 0 ? t('pages.templatePicker.apply') : t('pages.templatePicker.next')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

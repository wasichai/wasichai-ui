import { CORE_PAGE_COMPONENT_TYPES, useRegistry, type PageActionDefinition, type PageComponent, type PageComponentType } from '@wasichai/core'
import { useTranslation } from 'react-i18next'

// core's own kind. it goes last, so a module's kind is the default a fresh ACTION gets: with
// workflow installed that is TRANSITION, which is what the original app always defaulted to
export const NAVIGATE = 'NAVIGATE'

const CORE_TYPES: readonly string[] = CORE_PAGE_COMPONENT_TYPES

export function isCoreType(type: string): boolean {
  return CORE_TYPES.includes(type)
}

export function actionKinds(pageActions: Readonly<Record<string, PageActionDefinition>>): string[] {
  return [...Object.keys(pageActions), NAVIGATE]
}

// a module's patch -- a seed dropped from the palette, or a settings editor's onChange -- may only
// ever touch its own settings. type and children define the node's shape, uid is the builder's own
// key: none of the three is a module's to set, however its patch tries to sneak one in.
export function sanitizeModulePatch(patch: Partial<PageComponent>): Partial<PageComponent> {
  const { type: _type, children: _children, uid: _uid, ...settings } = patch as Partial<PageComponent> & { uid?: unknown }
  return settings
}

// starting values for a node dropped from the palette, merged over the blank one
export type Seed = (type: PageComponentType) => Partial<PageComponent>

export const NO_SEED: Seed = () => ({})

export function useSeed(): Seed {
  const { pageComponents, pageActions } = useRegistry()
  return (type) => {
    if (type !== 'ACTION') return pageComponents[type]?.defaults ?? {}
    const kind = actionKinds(pageActions)[0]
    // the kind last: a module's defaults must not pick a different kind than the one listed first
    return { ...(pageActions[kind]?.defaults ?? {}), action: kind }
  }
}

// core types by the pages bundle, module types by their labelKey. a type nobody registered (its
// module is not installed) keeps its raw name: a guess from a stale core string would lie
export function useTypeLabel(): (type: string) => string {
  const { t } = useTranslation(['pages', 'common'])
  const { pageComponents } = useRegistry()
  return (type) => {
    const definition = pageComponents[type]
    if (definition) return t(definition.labelKey)
    return isCoreType(type) ? t(`pages.types.${type}`) : type
  }
}

export function useActionKindLabel(): (kind: string) => string {
  const { t } = useTranslation(['pages', 'common'])
  const { pageActions } = useRegistry()
  return (kind) => {
    if (kind === NAVIGATE) return t('pages.actionKinds.NAVIGATE')
    const definition = pageActions[kind]
    return definition ? t(definition.labelKey) : kind
  }
}

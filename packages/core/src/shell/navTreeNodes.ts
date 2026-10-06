import type { LucideIcon } from 'lucide-react'
import { matchPath } from 'react-router'

// a tree menu (NavTree): groups, with subgroups optionally, and leaves. an app extends the leaf with its own fields

export interface NavTreeLeaf {
  label: string
  to: string
  // route patterns (react-router's) that draw this leaf's page too
  alsoAt?: string[]
  // another app: a plain <a>, loaded in full, never current
  external?: boolean
  // drawn only by a leaf at the root, where a group has its caret
  icon?: LucideIcon
}

export interface NavTreeGroup<L extends NavTreeLeaf = NavTreeLeaf> {
  label: string
  children: NavTreeNode<L>[]
}

export type NavTreeNode<L extends NavTreeLeaf = NavTreeLeaf> = NavTreeGroup<L> | L

export const isNavTreeGroup = <L extends NavTreeLeaf>(node: NavTreeNode<L>): node is NavTreeGroup<L> => 'children' in node

export const navTreeLeaves = <L extends NavTreeLeaf>(nodes: NavTreeNode<L>[]): L[] =>
  nodes.flatMap((node) => (isNavTreeGroup(node) ? navTreeLeaves(node.children) : [node]))

// the leaf current on a path: the one whose route is the path, else one whose alsoAt matches it, else the one whose
// route is the longest start of it. own route first: /infracciones/:id matches /infracciones/cuis too. a page with no
// leaf of its own has none, an external leaf is never current
export function currentNavTreeLeaf<L extends NavTreeLeaf>(nodes: NavTreeNode<L>[], pathname: string): L | undefined {
  const own = navTreeLeaves(nodes).filter((leaf) => !leaf.external)
  const exact = own.find((leaf) => leaf.to === pathname)
  if (exact) return exact
  const byPattern = own.find((leaf) => leaf.alsoAt?.some((pattern) => matchPath(pattern, pathname)))
  if (byPattern) return byPattern
  return own
    .filter((leaf) => pathname.startsWith(`${leaf.to}/`))
    .reduce<L | undefined>((best, leaf) => (!best || leaf.to.length > best.to.length ? leaf : best), undefined)
}

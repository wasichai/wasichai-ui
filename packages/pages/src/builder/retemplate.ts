// swapping a page's template rebuilds its regions -- the server requires the region list to equal
// the template's, exactly. this is where an admin's work would be silently destroyed, so it is
// pure, exported, and tested rule by rule instead of through the dom. the client decides where
// orphaned children go and sends an already-valid tree; the server never learns what an orphan is.
import type { PageTemplate } from '@wasichai/core'
import type { Node } from './pageTree'
import { regionKeys } from '@wasichai/core'

// only REGION children carry a name. narrows the type so callers don't juggle string | null.
function named(regions: Node[]): (Node & { region: string })[] {
  return regions.filter((region): region is Node & { region: string } => !!region.region)
}

// dying regions that would actually lose something. an empty dying region has nothing to lose, so
// it is not one of these -- orphans() and retemplate's refusal guard must agree on that, or the
// guard ends up blocking template swaps that orphan nothing.
function losing(regions: Node[], kept: Set<string>): (Node & { region: string })[] {
  return named(regions).filter((region) => !kept.has(region.region) && region.children.length > 0)
}

// what a template swap would destroy, region by region -- shown to the admin before they pick
// where things go. count is direct children, not the whole subtree: an orphan is a node that lost
// its parent region, and a grandchild inside a SECTION that moves along with it never lost anything.
export function orphans(tree: Node[], to: PageTemplate): { region: string; count: number }[] {
  const page = tree[0]
  if (!page) return []
  const kept = new Set(regionKeys(to))
  return losing(page.children, kept).map((region) => ({ region: region.region, count: region.children.length }))
}

// rebuilds the PAGE's regions for `to`. a region name both templates have keeps its uid and
// children untouched -- that uid is the admin's live canvas selection, rebuild it and the
// selection silently vanishes. a dying region's children land wherever `moves` sends them, in the
// order they held in the OLD template: Object.keys(moves) is insertion order, not that order, so
// the source tree (not moves) drives the append order when two dying regions share a destination.
export function retemplate(tree: Node[], to: PageTemplate, moves: Record<string, string>): Node[] {
  const page = tree[0]
  if (!page) return tree
  const keys = regionKeys(to)
  const kept = new Set(keys)
  // two ways to lose children on the floor: a move aimed at a region `to` has not got, or a
  // non-empty dying region with no move at all -- silence is not consent. either way the rebuild
  // below would still hand back a perfectly valid tree, so both must be caught before it runs, not
  // after: a partial rebuild is exactly the silent deletion this file exists to prevent.
  const misaimed = Object.values(moves).some((target) => !kept.has(target))
  const abandoned = losing(page.children, kept).some((region) => moves[region.region] === undefined)
  if (misaimed || abandoned) return tree

  const oldRegions = named(page.children)
  const byName = new Map(oldRegions.map((region) => [region.region, region]))

  const regions: Node[] = keys.map((key) => {
    const existing = byName.get(key)
    const incoming = oldRegions
      .filter((region) => !kept.has(region.region) && moves[region.region] === key)
      .flatMap((region) => region.children.map((child) => ({ ...child, column: 1 })))

    if (existing) return { ...existing, children: [...existing.children, ...incoming] }

    return {
      uid: crypto.randomUUID(),
      type: 'REGION',
      region: key,
      column: 1,
      title: null,
      layout: 'single-column',
      relationship: null,
      fields: null,
      content: null,
      children: incoming
    }
  })

  return [{ ...page, children: regions }]
}

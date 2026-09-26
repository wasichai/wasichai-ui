import { describe, expect, it } from 'vitest'
import type { PageTemplate } from '@wasichai/core'
import type { Node } from './pageTree'
import { orphans, retemplate } from './retemplate'

function leaf(type: Node['type'], extra: Partial<Node> = {}): Node {
  return {
    uid: crypto.randomUUID(),
    type,
    column: 1,
    title: null,
    layout: 'single-column',
    children: [],
    relationship: null,
    fields: null,
    content: null,
    region: null,
    ...extra
  }
}

function region(name: string, children: Node[] = [], extra: Partial<Node> = {}): Node {
  return leaf('REGION', { region: name, children, ...extra })
}

function page(children: Node[], extra: Partial<Node> = {}): Node[] {
  return [leaf('PAGE', { children, ...extra })]
}

// one region per row keeps the fixture readable -- span and row grouping do not matter here,
// only the name order regionKeys() reads off.
function template(...names: string[]): PageTemplate {
  return { name: names.join('-'), columns: 12, rows: names.map((name) => ({ regions: [{ name, span: 12 }] })) }
}

describe('retemplate', () => {
  it("rebuilds regions in the new template's order", () => {
    const tree = page([region('A'), region('B')])
    const next = retemplate(tree, template('B', 'A'), {})
    expect(next[0].children.map((child) => child.region)).toEqual(['B', 'A'])
  })

  it('a key both templates have keeps its children and its uid', () => {
    const form = leaf('FORM')
    const main = region('MAIN', [form], { uid: 'main-uid' })
    const tree = page([main, region('HEADER')])
    const next = retemplate(tree, template('MAIN', 'ASIDE'), {})
    const survivor = next[0].children.find((child) => child.region === 'MAIN')
    expect(survivor?.uid).toBe('main-uid')
    expect(survivor?.children).toEqual([form])
  })

  it("a dying region's children are appended to the region moves names", () => {
    const orphan = leaf('TEXT', { uid: 'c2' })
    const tree = page([region('MAIN', [leaf('FORM')]), region('OLD', [orphan])])
    const next = retemplate(tree, template('MAIN', 'ASIDE'), { OLD: 'ASIDE' })
    const aside = next[0].children.find((child) => child.region === 'ASIDE')
    expect(aside?.children).toEqual([{ ...orphan, column: 1 }])
  })

  it('two dying regions aimed at one survivor append in source-template order', () => {
    const c1 = leaf('TEXT', { uid: 'c1' })
    const c2 = leaf('TEXT', { uid: 'c2' })
    const tree = page([region('OLD1', [c1]), region('OLD2', [c2])])
    // moves is keyed out of source order on purpose: Object.keys is insertion order, not the rule
    const next = retemplate(tree, template('ASIDE'), { OLD2: 'ASIDE', OLD1: 'ASIDE' })
    const aside = next[0].children.find((child) => child.region === 'ASIDE')
    expect(aside?.children.map((child) => child.uid)).toEqual(['c1', 'c2'])
  })

  it('a new key starts empty', () => {
    const tree = page([region('MAIN')])
    const next = retemplate(tree, template('MAIN', 'ASIDE'), {})
    const aside = next[0].children.find((child) => child.region === 'ASIDE')
    expect(aside?.children).toEqual([])
  })

  it('a moved child keeps its uid with column clamped to 1', () => {
    const child = leaf('TEXT', { uid: 'c1', column: 2 })
    const tree = page([region('OLD', [child])])
    const next = retemplate(tree, template('ASIDE'), { OLD: 'ASIDE' })
    const aside = next[0].children.find((candidate) => candidate.region === 'ASIDE')
    expect(aside?.children[0]).toMatchObject({ uid: 'c1', column: 1 })
  })

  it('the PAGE node keeps its uid', () => {
    const tree = page([region('MAIN')], { uid: 'page-uid' })
    const next = retemplate(tree, template('MAIN'), {})
    expect(next[0].uid).toBe('page-uid')
  })

  it('refuses a moves naming a region the new template has not got, and changes nothing', () => {
    const tree = page([region('MAIN'), region('OLD')])
    const next = retemplate(tree, template('MAIN'), { OLD: 'GHOST' })
    expect(next).toBe(tree)
  })

  // the bug this guards: without it, a non-empty dying region left out of moves is not rebuilt
  // (it dies) and never lands in anyone's incoming (nothing names it) -- silently deleted, and the
  // tree that comes back is still perfectly valid, so nothing downstream would ever catch it.
  it('refuses when a non-empty dying region has no entry in moves, and changes nothing', () => {
    const tree = page([region('MAIN'), region('HEADER', [leaf('TEXT')])])
    const next = retemplate(tree, template('MAIN'), {})
    expect(next).toBe(tree)
  })

  // the trap on the other side: guarding on every dying region, empty or not, would refuse the
  // one-click path where nothing is actually orphaned -- the common case the dialog exists for.
  it('rebuilds normally with an empty moves when every dying region is empty', () => {
    const form = leaf('FORM')
    const tree = page([region('MAIN', [form]), region('EMPTY')])
    const next = retemplate(tree, template('MAIN'), {})
    expect(next).not.toBe(tree)
    expect(next[0].children.map((child) => child.region)).toEqual(['MAIN'])
    expect(next[0].children[0].children).toEqual([form])
  })
})

describe('orphans', () => {
  it('ignores an empty dying region', () => {
    // FULL has 2 direct children but 3 nodes total (the SECTION carries a FORM of its own) --
    // count must read 2, proving it counts direct children, not the whole subtree.
    const tree = page([region('MAIN'), region('EMPTY'), region('FULL', [leaf('SECTION', { children: [leaf('FORM')] }), leaf('TEXT')])])
    expect(orphans(tree, template('MAIN'))).toEqual([{ region: 'FULL', count: 2 }])
  })
})

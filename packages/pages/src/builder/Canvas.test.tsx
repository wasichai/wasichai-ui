// the drop handler is exported so it can be tested without a pointer, which jsdom has not got
import { describe, expect, it } from 'vitest'
import { applyDrop } from './Canvas'
import { countOf, nodeAt } from './pageTree'
import type { Node } from './pageTree'

// the same factory pageTree.test.ts uses. repeated rather than shared: a test fixture that two
// suites pull on is a third thing to keep in step.
function node(type: Node['type'], children: Node[] = [], extra: Partial<Node> = {}): Node {
  return { uid: crypto.randomUUID(), type, column: 1, title: null, layout: 'single-column', children, ...extra } as Node
}

// a page with a template of two regions, the shape every drop test below aims at. the root is
// furniture now: nothing lands beside it, and nothing lands in the page except a region.
const scaffold = () => [node('PAGE', [node('REGION', [], { region: 'MAIN' }), node('REGION', [], { region: 'RIGHT' })])]

it('puts a palette item into the region it was dropped in', () => {
  const next = applyDrop(scaffold(), { active: 'palette:SECTION', over: 'slot:0.0.0:1' })
  expect(nodeAt(next, [0, 0, 0])?.type).toBe('SECTION')
})

it('nests a palette item dropped inside a container', () => {
  const tree = scaffold()
  const withSection = applyDrop(tree, { active: 'palette:SECTION', over: 'slot:0.0.0:1' })
  const next = applyDrop(withSection, { active: 'palette:FORM', over: 'slot:0.0.0.0' })
  expect(nodeAt(next, [0, 0, 0, 0])?.type).toBe('FORM')
})

it('moves an existing node instead of copying it', () => {
  const tree = [node('PAGE', [node('REGION', [node('FORM')], { region: 'MAIN' }), node('REGION', [node('SECTION', [])], { region: 'RIGHT' })])]
  const next = applyDrop(tree, { active: `node:${nodeAt(tree, [0, 0, 0])!.uid}`, over: 'slot:0.1.0:1' })
  expect(countOf(next)).toBe(countOf(tree))
  expect(nodeAt(next, [0, 1, 0])?.type).toBe('FORM')
})

it('refuses a drop the tree rules forbid and changes nothing', () => {
  const tree = [node('PAGE', [node('REGION', [node('TABS', [node('TAB', [])])], { region: 'MAIN' })])]
  const next = applyDrop(tree, { active: 'palette:FORM', over: 'slot:0.0.0.0' })
  expect(next).toEqual(tree)
})

it('creates a tab strip with one tab already in it, inside a region', () => {
  const next = applyDrop(scaffold(), { active: 'palette:TABS', over: 'slot:0.0.0:1' })
  expect(nodeAt(next, [0, 0, 0, 0])?.type).toBe('TAB')
})

it('drops a palette item into the region it was aimed at', () => {
  const next = applyDrop(scaffold(), { active: 'palette:FORM', over: 'slot:0.1.0:1' })
  expect(nodeAt(next, [0, 1, 0])?.type).toBe('FORM')
})

it('refuses a drop beside the page', () => {
  const tree = scaffold()
  expect(applyDrop(tree, { active: 'palette:FORM', over: 'slot:1:1' })).toEqual(tree)
})

it('refuses a drop inside the page, beside a region', () => {
  const tree = scaffold()
  expect(applyDrop(tree, { active: 'palette:FORM', over: 'slot:0.2:1' })).toEqual(tree)
})

it('moves a node from one region to the other, keeping its id', () => {
  const tree = [node('PAGE', [node('REGION', [node('FORM')], { region: 'MAIN' }), node('REGION', [], { region: 'RIGHT' })])]
  const uid = nodeAt(tree, [0, 0, 0])!.uid
  const next = applyDrop(tree, { active: `node:${uid}`, over: 'slot:0.1.0:1' })
  expect(nodeAt(next, [0, 1, 0])?.uid).toBe(uid)
  expect(nodeAt(next, [0, 0])?.children).toHaveLength(0)
})

// extra coverage past the brief: the edges applyDrop itself calls out (no slot, the component
// bound, a stale uid), since a wrong answer there fails silently instead of throwing
describe('applyDrop edges', () => {
  it('ignores a drop that did not land on a slot', () => {
    const tree = [node('SECTION', [])]
    const next = applyDrop(tree, { active: 'palette:FORM', over: null })
    expect(next).toEqual(tree)
  })

  it('refuses a palette drop once the tree is at the component bound', () => {
    // PAGE + REGION + 198 leaves = 200, the bound itself. a bare root would be refused by
    // accepts() before the bound is ever checked, which would test the wrong thing.
    const region = node(
      'REGION',
      Array.from({ length: 198 }, () => node('TEXT')),
      { region: 'MAIN' }
    )
    const tree = [node('PAGE', [region])]
    const next = applyDrop(tree, { active: 'palette:TEXT', over: 'slot:0.0.198:1' })
    expect(next).toEqual(tree)
  })

  it('ignores a move whose source uid is not in the tree', () => {
    const tree = [node('SECTION', [])]
    const next = applyDrop(tree, { active: 'node:missing', over: 'slot:0.0' })
    expect(next).toEqual(tree)
  })
})

// a slot carries its own column (slot:<path>:<column>), because a two-column container's left
// and right slots share the same path otherwise and a drop could never tell them apart
describe('applyDrop and columns', () => {
  it('gives a palette drop the column of the slot it landed on', () => {
    const tree = [node('SECTION', [], { layout: 'two-column' })]
    const next = applyDrop(tree, { active: 'palette:FORM', over: 'slot:0.0:2' })
    expect(nodeAt(next, [0, 0])?.column).toBe(2)
  })

  it('moves a node from column 1 into a column-2 slot and relabels it', () => {
    const tree = [node('SECTION', [node('FORM', [], { column: 1 }), node('TEXT', [], { column: 1 })], { layout: 'two-column' })]
    const uid = nodeAt(tree, [0, 0])!.uid
    const next = applyDrop(tree, { active: `node:${uid}`, over: 'slot:0.2:2' })
    const moved = next.find((root) => root.uid === tree[0].uid)?.children.find((child) => child.uid === uid)
    expect(moved?.column).toBe(2)
  })

  it('leaves the column unchanged when moving within the same column', () => {
    const tree = [node('SECTION', [node('FORM', [], { column: 1 }), node('TEXT', [], { column: 1 })], { layout: 'two-column' })]
    const uid = nodeAt(tree, [0, 0])!.uid
    const next = applyDrop(tree, { active: `node:${uid}`, over: 'slot:0.2:1' })
    const moved = next.find((root) => root.uid === tree[0].uid)?.children.find((child) => child.uid === uid)
    expect(moved?.column).toBe(1)
  })

  it('gives a drop into a single-column container column 1', () => {
    const tree = [node('SECTION', [])]
    const next = applyDrop(tree, { active: 'palette:FORM', over: 'slot:0.0:1' })
    expect(nodeAt(next, [0, 0])?.column).toBe(1)
  })
})

// dropping on a tab title is the net under hover-to-open: before the timer fires, the title is all
// there is to hit, and a drop that landed on nothing would just evaporate.
it('appends to the tab whose title the drop landed on', () => {
  const tree = [node('PAGE', [node('REGION', [node('TABS', [node('TAB', []), node('TAB', [node('FORM')])])], { region: 'MAIN' })])]
  const strip = nodeAt(tree, [0, 0, 0])!
  const second = nodeAt(tree, [0, 0, 0, 1])!
  const next = applyDrop(tree, { active: 'palette:TEXT', over: `tab:${strip.uid}:${second.uid}` })
  expect(nodeAt(next, [0, 0, 0, 1])?.children.map((child) => child.type)).toEqual(['FORM', 'TEXT'])
})

it('ignores a tab handle naming a tab that is not there', () => {
  const tree = [node('PAGE', [node('REGION', [node('TABS', [node('TAB', [])])], { region: 'MAIN' })])]
  expect(applyDrop(tree, { active: 'palette:TEXT', over: 'tab:strip:ghost' })).toEqual(tree)
})

// a field drags under its own id, not a type: field:<name>. it needs its own branch because
// anything that is not palette: falls through to the move branch, where the drop evaporates.
it('places a field inside the dynamic form it was dropped in', () => {
  const tree = [node('PAGE', [node('REGION', [node('DYNAMIC_FORM', [])], { region: 'MAIN' })])]
  const next = applyDrop(tree, { active: 'field:codigo', over: 'slot:0.0.0.0:1' })
  expect(nodeAt(next, [0, 0, 0, 0])?.type).toBe('FIELD')
  expect(nodeAt(next, [0, 0, 0, 0])?.field).toBe('codigo')
})

it('refuses the same field twice on one form', () => {
  const tree = [node('PAGE', [node('REGION', [node('DYNAMIC_FORM', [node('FIELD', [], { field: 'codigo' })])], { region: 'MAIN' })])]
  expect(applyDrop(tree, { active: 'field:codigo', over: 'slot:0.0.0.1:1' })).toEqual(tree)
})

// two forms are two forms: the rule is "twice on one", never "twice on the page"
it('lets two dynamic forms hold the same field', () => {
  const tree = [node('PAGE', [node('REGION', [node('DYNAMIC_FORM', [node('FIELD', [], { field: 'codigo' })]), node('DYNAMIC_FORM', [])], { region: 'MAIN' })])]
  const next = applyDrop(tree, { active: 'field:codigo', over: 'slot:0.0.1.0:1' })
  expect(nodeAt(next, [0, 0, 1, 0])?.field).toBe('codigo')
})

it('refuses a field dropped anywhere but a dynamic form', () => {
  const tree = [node('PAGE', [node('REGION', [node('SECTION', [])], { region: 'MAIN' })])]
  expect(applyDrop(tree, { active: 'field:codigo', over: 'slot:0.0.0.0:1' })).toEqual(tree)
})

it('refuses anything but a field inside a dynamic form', () => {
  const tree = [node('PAGE', [node('REGION', [node('DYNAMIC_FORM', [])], { region: 'MAIN' })])]
  expect(applyDrop(tree, { active: 'palette:TEXT', over: 'slot:0.0.0.0:1' })).toEqual(tree)
})

describe('applyDrop and module seeds', () => {
  it('drops an ACTION as NAVIGATE when nothing seeds it', () => {
    const next = applyDrop(scaffold(), { active: 'palette:ACTION', over: 'slot:0.0.0:1' })
    expect(nodeAt(next, [0, 0, 0])).toMatchObject({ type: 'ACTION', action: 'NAVIGATE', style: 'SECONDARY' })
  })

  it('merges the seed of a module type over the blank node', () => {
    const seed = (type: string) => (type === 'PIN' ? { title: 'Chincheta nueva', color: 'rojo' } : {})
    const next = applyDrop(scaffold(), { active: 'palette:PIN', over: 'slot:0.0.0:1' }, seed)
    expect(nodeAt(next, [0, 0, 0])).toMatchObject({ type: 'PIN', title: 'Chincheta nueva', color: 'rojo', column: 1 })
  })

  it('never lets a seed replace the type, the column or the children', () => {
    const seed = () => ({ type: 'OTHER', column: 2, children: [{ type: 'TEXT' } as never] })
    const next = applyDrop(scaffold(), { active: 'palette:SECTION', over: 'slot:0.0.0:1' }, seed)
    expect(nodeAt(next, [0, 0, 0])).toMatchObject({ type: 'SECTION', column: 1, children: [] })
  })

  // uid is the builder's own key, generated fresh for every node: a seed cannot steal another
  // node's identity by naming it
  it('never lets a seed replace the uid the builder just minted', () => {
    const seed = () => ({ uid: 'stolen-uid' })
    const next = applyDrop(scaffold(), { active: 'palette:SECTION', over: 'slot:0.0.0:1' }, seed)
    expect(nodeAt(next, [0, 0, 0])?.uid).not.toBe('stolen-uid')
  })
})

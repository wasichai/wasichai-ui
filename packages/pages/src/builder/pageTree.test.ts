import { describe, expect, it } from 'vitest'
import { accepts, canDrop, countOf, depthOf, insert, move, nodeAt, remove, toDefinition, withIds } from './pageTree'
import type { Node } from './pageTree'

function node(type: Node['type'], children: Node[] = [], extra: Partial<Node> = {}): Node {
  return { uid: `${type}-${children.length}-${extra.title ?? ''}`, type, column: 1, title: null, layout: 'single-column', children, ...extra } as Node
}

const tree: Node[] = [node('SECTION', [node('FORM'), node('TEXT')], { title: 'Datos' }), node('TABS', [node('TAB', [node('MAP')], { title: 'Mapa' })])]

describe('nodeAt', () => {
  it('walks a path of indices', () => {
    expect(nodeAt(tree, [0])?.type).toBe('SECTION')
    expect(nodeAt(tree, [0, 1])?.type).toBe('TEXT')
    expect(nodeAt(tree, [1, 0, 0])?.type).toBe('MAP')
  })

  it('answers null for a path that leads nowhere', () => {
    expect(nodeAt(tree, [5])).toBeNull()
    expect(nodeAt(tree, [0, 9])).toBeNull()
    expect(nodeAt(tree, [])).toBeNull()
  })
})

describe('insert', () => {
  it('puts a node at an index of the root', () => {
    const next = insert(tree, [1], node('HISTORY'))
    expect(next.map((child) => child.type)).toEqual(['SECTION', 'HISTORY', 'TABS'])
  })

  it('puts a node inside a container', () => {
    const next = insert(tree, [0, 0], node('HISTORY'))
    expect(nodeAt(next, [0, 0])?.type).toBe('HISTORY')
    expect(nodeAt(next, [0, 1])?.type).toBe('FORM')
  })

  it('leaves the original alone', () => {
    insert(tree, [0, 0], node('HISTORY'))
    expect(nodeAt(tree, [0, 0])?.type).toBe('FORM')
  })
})

describe('remove', () => {
  it('takes a node out of a container', () => {
    const next = remove(tree, [0, 0])
    expect(nodeAt(next, [0])?.children.map((child) => child.type)).toEqual(['TEXT'])
  })
})

describe('move', () => {
  it('reorders inside one container', () => {
    const next = move(tree, [0, 0], [0, 2])
    expect(nodeAt(next, [0])?.children.map((child) => child.type)).toEqual(['TEXT', 'FORM'])
  })

  it('moves between containers', () => {
    const next = move(tree, [0, 0], [1, 0, 0])
    expect(nodeAt(next, [0])?.children.map((child) => child.type)).toEqual(['TEXT'])
    expect(nodeAt(next, [1, 0])?.children.map((child) => child.type)).toEqual(['FORM', 'MAP'])
  })

  // removing from before the target shifts every later index in that container.
  // the root is no longer a drop target, so the siblings live inside a region.
  it('lands where it was aimed even when the removal shifted the target', () => {
    const flat = [node('REGION', [node('FORM'), node('TEXT'), node('HISTORY')])]
    const next = move(flat, [0, 0], [0, 2])
    expect(nodeAt(next, [0])?.children.map((child) => child.type)).toEqual(['TEXT', 'FORM', 'HISTORY'])
  })

  it('refuses a node into its own descendant and changes nothing', () => {
    const next = move(tree, [0], [0, 1])
    expect(next).toEqual(tree)
  })
})

describe('accepts', () => {
  it('lets a tab strip hold tabs and nothing else', () => {
    expect(accepts('TABS', 'TAB')).toBe(true)
    expect(accepts('TABS', 'FORM')).toBe(false)
  })

  it('keeps a tab inside a strip', () => {
    expect(accepts('SECTION', 'TAB')).toBe(false)
    expect(accepts(null, 'TAB')).toBe(false)
  })

  it('lets any other container hold anything, and a leaf hold nothing', () => {
    expect(accepts('SECTION', 'MAP')).toBe(true)
    // the root is not a drop target any more: the page is the only thing that lives there
    expect(accepts(null, 'SECTION')).toBe(false)
    expect(accepts('FORM', 'TEXT')).toBe(false)
  })
})

describe('accepts, with the scaffold', () => {
  it('lets a region hold anything a section could', () => {
    expect(accepts('REGION', 'FORM')).toBe(true)
    expect(accepts('REGION', 'SECTION')).toBe(true)
    expect(accepts('REGION', 'TABS')).toBe(true)
  })

  it('keeps a region out of every drop', () => {
    expect(accepts('PAGE', 'REGION')).toBe(false)
    expect(accepts('SECTION', 'REGION')).toBe(false)
    expect(accepts(null, 'REGION')).toBe(false)
  })

  it('keeps the page out of every drop', () => {
    expect(accepts(null, 'PAGE')).toBe(false)
    expect(accepts('REGION', 'PAGE')).toBe(false)
  })

  // the root is not a drop target any more: the page is the only thing that lives there
  it('lets nothing live beside the page', () => {
    expect(accepts(null, 'SECTION')).toBe(false)
    expect(accepts(null, 'FORM')).toBe(false)
  })

  it('lets only regions live in a page', () => {
    expect(accepts('PAGE', 'FORM')).toBe(false)
    expect(accepts('PAGE', 'SECTION')).toBe(false)
  })

  it('keeps a tab inside a strip, region or no region', () => {
    expect(accepts('REGION', 'TAB')).toBe(false)
    expect(accepts('TABS', 'TAB')).toBe(true)
  })
})

describe('canDrop', () => {
  // page and region spend two of the twelve levels as furniture, so nine sections around a form
  // (a 10-deep subtree) still lands exactly on the bound once it sits inside a region.
  it('accepts a leaf that lands exactly on the bound', () => {
    let deep: Node = node('FORM')
    for (let i = 0; i < 9; i += 1) deep = node('SECTION', [deep])
    const full = [node('PAGE', [node('REGION', [deep, node('TEXT')])])]
    expect(depthOf([deep])).toBe(10)
    // the TEXT lands beside the FORM, at depth 12 once PAGE and REGION are counted in
    expect(canDrop(full, [0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true)
  })

  it('refuses a drop whose own height would push the tree past the bound', () => {
    let deep: Node = node('FORM')
    for (let i = 0; i < 9; i += 1) deep = node('SECTION', [deep])
    // this one is two tall, so the same landing spot would reach depth 13
    const full = [node('PAGE', [node('REGION', [deep, node('SECTION', [node('FORM')])])])]
    expect(canDrop(full, [0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(false)
  })

  it('refuses a leaf as the parent of anything', () => {
    const flat = [node('FORM'), node('TEXT')]
    expect(canDrop(flat, [1], [0, 0])).toBe(false)
  })

  // pins the frontend's free budget against the backend's own `PageApiTest.kt` case: the scaffold
  // must not quietly cost the admin two of their ten free levels (see ADR-022).
  it('accepts a ten-deep subtree moved straight into an empty region, and refuses an eleven-deep one', () => {
    let ten: Node = node('FORM')
    for (let i = 0; i < 9; i += 1) ten = node('SECTION', [ten])
    const tenTree = [node('PAGE', [node('REGION', [ten]), node('REGION', [])])]
    expect(depthOf([ten])).toBe(10)
    expect(canDrop(tenTree, [0, 0, 0], [0, 1, 0])).toBe(true)

    let eleven: Node = node('FORM')
    for (let i = 0; i < 10; i += 1) eleven = node('SECTION', [eleven])
    const elevenTree = [node('PAGE', [node('REGION', [eleven]), node('REGION', [])])]
    expect(canDrop(elevenTree, [0, 0, 0], [0, 1, 0])).toBe(false)
  })
})

describe('depthOf and countOf', () => {
  it('measure the tree', () => {
    expect(depthOf(tree)).toBe(3)
    expect(countOf(tree)).toBe(6)
  })
})

describe('withIds and toDefinition', () => {
  it('adds a uid on the way in and strips it on the way out', () => {
    const annotated = withIds([
      { type: 'FORM', column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null }
    ])
    expect(annotated[0].uid).toEqual(expect.any(String))
    expect(toDefinition(annotated)[0]).not.toHaveProperty('uid')
  })

  it('gives every node its own uid, however deep', () => {
    const annotated = withIds(toDefinition(tree))
    const uids = new Set<string>()
    const walk = (nodes: Node[]) =>
      nodes.forEach((child) => {
        uids.add(child.uid)
        walk(child.children)
      })
    walk(annotated)
    expect(uids.size).toBe(countOf(tree))
  })
})

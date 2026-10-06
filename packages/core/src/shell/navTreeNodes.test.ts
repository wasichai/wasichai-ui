import { describe, expect, it } from 'vitest'
import { currentNavTreeLeaf, isNavTreeGroup, navTreeLeaves, type NavTreeLeaf, type NavTreeNode } from './navTreeNodes'

// srtm-ui's tree, cut down: a leaf with alsoAt, one under a subgroup, two whose routes nest, an external one at the root
const NODES: NavTreeNode[] = [
  {
    label: 'Contribuyentes',
    children: [
      { label: 'Buscar contribuyentes', to: '/contribuyentes' },
      { label: 'Nuevo contribuyente', to: '/contribuyentes/nuevo' }
    ]
  },
  { label: 'Declaraciones', children: [{ label: 'Nueva declaración', to: '/declaraciones/nueva', alsoAt: ['/contribuyentes/:id/declaraciones/nueva'] }] },
  {
    label: 'Infracciones',
    children: [
      { label: 'Expedientes', to: '/infracciones', alsoAt: ['/infracciones/:id'] },
      { label: 'CUIS', to: '/infracciones/cuis' }
    ]
  },
  { label: 'Tributos', children: [{ label: 'Impuesto predial', children: [{ label: 'Cuenta corriente', to: '/cuenta' }] }] },
  { label: 'Administración', to: '/admin', external: true }
]

describe('isNavTreeGroup', () => {
  it('tells a group from a leaf', () => {
    expect(NODES.map(isNavTreeGroup)).toEqual([true, true, true, true, false])
  })
})

describe('navTreeLeaves', () => {
  it('lists every leaf in order, subgroups and external ones included', () => {
    expect(navTreeLeaves(NODES).map((leaf) => leaf.label)).toEqual([
      'Buscar contribuyentes',
      'Nuevo contribuyente',
      'Nueva declaración',
      'Expedientes',
      'CUIS',
      'Cuenta corriente',
      'Administración'
    ])
  })
})

describe('currentNavTreeLeaf', () => {
  it.each([
    ['/', undefined],
    ['/contribuyentes', 'Buscar contribuyentes'],
    // under a leaf's route: the longest start wins
    ['/contribuyentes/123', 'Buscar contribuyentes'],
    ['/contribuyentes/nuevo', 'Nuevo contribuyente'],
    // alsoAt over a shorter start
    ['/contribuyentes/123/declaraciones/nueva', 'Nueva declaración'],
    ['/declaraciones/nueva', 'Nueva declaración'],
    // a page with no leaf of its own
    ['/declaraciones/d1', undefined],
    ['/infracciones/0b5e8f1a', 'Expedientes'],
    // its own route over another leaf's alsoAt: /infracciones/:id matches /infracciones/cuis too
    ['/infracciones/cuis', 'CUIS'],
    // a trailing slash is the same page
    ['/infracciones/cuis/', 'CUIS'],
    ['/contribuyentes/', 'Buscar contribuyentes'],
    ['/cuenta/2026', 'Cuenta corriente'],
    // a string prefix is not a start of the route
    ['/contribuyentesx', undefined],
    // an external leaf is another app: never current
    ['/admin', undefined]
  ])('on %s is %s', (path, label) => {
    expect(currentNavTreeLeaf(NODES, path)?.label).toBe(label)
  })

  // an app's leaves keep their own fields (caja-ui's clave), and identity holds (its breadcrumb trail compares them)
  it("returns the app's own leaf", () => {
    interface Hoja extends NavTreeLeaf {
      clave: string
    }
    const caja: Hoja = { clave: 'caja', label: 'Caja', to: '/caja' }
    const nodes: NavTreeNode<Hoja>[] = [{ label: 'Tesorería', children: [caja] }]
    const current = currentNavTreeLeaf(nodes, '/caja')
    expect(current).toBe(caja)
    expect(current?.clave).toBe('caja')
  })
})

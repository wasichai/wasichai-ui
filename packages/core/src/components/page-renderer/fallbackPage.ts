import type { Page, PageComponent, PageComponentType, RelatedSide } from '../../types/metadata'

const MAIN = 'MAIN'

function node(type: PageComponentType, extra: Partial<PageComponent> = {}): PageComponent {
  return { type, column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, region: null, ...extra }
}

// the detail page when the backend has no pages module: the whole form, one list per
// relationship, then the history, in one full-width region.
export function fallbackPage(objectName: string, sides: RelatedSide[]): Page {
  const children = [node('FORM'), ...sides.map((side) => node('RELATED_LIST', { relationship: side.relationship })), node('HISTORY')]
  return {
    id: '',
    name: `${objectName}_record_detail`,
    label: objectName,
    objectName,
    kind: 'RECORD_DETAIL',
    template: { name: 'fallback', columns: 12, rows: [{ regions: [{ name: MAIN, span: 12 }] }] },
    generated: true,
    definition: { page: node('PAGE', { children: [node('REGION', { region: MAIN, children })] }) }
  }
}

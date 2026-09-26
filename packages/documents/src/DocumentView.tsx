import type { ReactNode } from 'react'
import { getI18n } from 'react-i18next'
import { Table, Td, Th } from '@wasichai/ui'
import type { DocumentSnapshot, TemplateNode } from './types'

// walks the frozen node tree and draws it. no html parser anywhere in here: a template is
// prosemirror json, so the only way to read it wrong is to add a mark or node type below.
export function DocumentView({ snapshot }: { snapshot: DocumentSnapshot }) {
  return <div className="space-y-2 text-sm text-ink">{renderNode(snapshot.template, snapshot, 'root')}</div>
}

// a snapshot is frozen; the thing it names (a field, a relationship) may have moved on since. an
// unknown name, or a value that is not text -- an object, a geometry, an array -- prints as
// nothing, never `undefined` and never `[object Object]`.
//
// a boolean is a real field value and a document is prose, so it reads as a word, not as `true`.
function printable(value: unknown): string {
  // getI18n() is react-i18next's process-global instance, not a hook -- fine here since this app
  // runs one instance per page, which is what this helper (called outside any component) needs.
  if (typeof value === 'boolean') return value ? getI18n().t('common.yes') : getI18n().t('common.no')
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

function renderNodes(nodes: TemplateNode[] | null | undefined, snapshot: DocumentSnapshot, keyPrefix: string): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, snapshot, `${keyPrefix}-${index}`))
}

function renderHeading(level: unknown, content: ReactNode[], key: string): ReactNode {
  switch (Number(level ?? 1)) {
    case 2:
      return <h2 key={key}>{content}</h2>
    case 3:
      return <h3 key={key}>{content}</h3>
    case 4:
      return <h4 key={key}>{content}</h4>
    case 5:
      return <h5 key={key}>{content}</h5>
    case 6:
      return <h6 key={key}>{content}</h6>
    default:
      return <h1 key={key}>{content}</h1>
  }
}

function applyMarks(text: string, marks: TemplateNode['marks']): ReactNode {
  return (marks ?? []).reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{acc}</strong>
      case 'italic':
        return <em>{acc}</em>
      case 'underline':
        return <u>{acc}</u>
      case 'strike':
        return <s>{acc}</s>
      default:
        // an unknown mark from a future editor. keep the text, drop the styling.
        return acc
    }
  }, text)
}

function renderNode(node: TemplateNode, snapshot: DocumentSnapshot, key: string): ReactNode {
  switch (node.type) {
    case 'doc':
      return <div key={key}>{renderNodes(node.content, snapshot, key)}</div>
    case 'paragraph':
      return <p key={key}>{renderNodes(node.content, snapshot, key)}</p>
    case 'heading':
      return renderHeading(node.attrs?.level, renderNodes(node.content, snapshot, key), key)
    case 'bulletList':
      return (
        <ul key={key} className="list-disc pl-5">
          {renderNodes(node.content, snapshot, key)}
        </ul>
      )
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal pl-5">
          {renderNodes(node.content, snapshot, key)}
        </ol>
      )
    case 'listItem':
      return <li key={key}>{renderNodes(node.content, snapshot, key)}</li>
    case 'hardBreak':
      return <br key={key} />
    case 'text':
      // text carries no html: it is a plain string, printed as a plain string
      return <span key={key}>{applyMarks(node.text ?? '', node.marks)}</span>
    case 'objectField':
      return <span key={key}>{printable(snapshot.values[String(node.attrs?.field ?? '')])}</span>
    case 'platformValue':
      return <span key={key}>{printable(snapshot.platform[String(node.attrs?.value ?? '')])}</span>
    case 'relatedTable':
      return <RelatedTableView key={key} relationship={String(node.attrs?.relationship ?? '')} snapshot={snapshot} />
    default:
      // node type this viewer does not know yet. draw its children rather than crash the page.
      return renderNodes(node.content, snapshot, key)
  }
}

function RelatedTableView({ relationship, snapshot }: { relationship: string; snapshot: DocumentSnapshot }) {
  const table = snapshot.related[relationship]
  // the relationship named in the frozen template may since have been deleted. draw nothing.
  if (!table) return null

  return (
    <Table>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <Th key={column.name}>{column.label}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, index) => (
          <tr key={index}>
            {table.columns.map((column) => (
              <Td key={column.name}>{printable(row[column.name])}</Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

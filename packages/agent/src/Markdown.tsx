import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { Link } from 'react-router'
import remarkGfm from 'remark-gfm'
import { cn } from '@wasichai/ui'

// a figure on its own: an amount, a count, a percentage, a year. "S/ 1 234,56", "81,744", "-5 %", "2026"
;('// a path of this app (/predios/<id>): followed in the app, so it opens where the app opens it (a workspace tab). ') //host"
// is another site, not a path
export function isAppPath(href: string | undefined): href is string {
  return !!href && href.startsWith('/') && !href.startsWith('//')
}

const FIGURE = /^[-+−]?\s*(S\/|US\$|\$|€)?\s*[-+−]?\d[\d.,\s  ]*(\s*%)?$/

export function isFigure(text: string): boolean {
  const clean = text.trim()
  return clean.length > 0 && FIGURE.test(clean)
}

// the text of a cell, however markdown nested it (**12**, `12`)
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement<{ children?: ReactNode }>(child)) return textOf(child.props.children)
      return ''
    })
    .join('')
}

// a cell holding a figure reads right-aligned and in tabular digits, like the portal's own tables: columns of
// amounts line up by their last digit. the model's own alignment (| ---: |) wins when it gave one
function Cell({ node: _node, children, className, style, ...props }: ComponentProps<'td'> & { node?: unknown }) {
  const text = textOf(children).trim()
  const figure = !style?.textAlign && isFigure(text)
  // a code (01-02-003, 000157995-0004-0001) is one word: it must not break at its hyphens. a long text gets room
  const word = text.length > 0 && text.length <= 32 && !/\s/.test(text)
  return (
    <td
      {...props}
      style={style}
      className={cn(
        'border-b border-line px-3 py-1.5 align-top',
        (figure || word) && 'whitespace-nowrap',
        figure && 'text-right tabular-nums',
        // a name or an address keeps a readable width; the table scrolls rather than squeeze it into a strip
        !figure && !word && text.length > 24 && 'min-w-56',
        className
      )}
    >
      {children}
    </td>
  )
}

const components: Components = {
  p: ({ node: _node, ...props }) => <p className="my-3 max-w-[75ch] first:mt-0 last:mb-0" {...props} />,
  h1: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 text-lg font-semibold text-ink first:mt-0" {...props} />,
  h2: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 text-base font-semibold text-ink first:mt-0" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 className="mt-4 mb-1.5 font-semibold text-ink first:mt-0" {...props} />,
  h4: ({ node: _node, ...props }) => <h5 className="mt-3 mb-1 font-semibold text-ink first:mt-0" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-3 max-w-[75ch] list-disc space-y-1 pl-5 marker:text-ink-muted" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-3 max-w-[75ch] list-decimal space-y-1 pl-5 marker:text-ink-muted" {...props} />,
  li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-ink" {...props} />,
  // the model links each predio, contribuyente or record it names to its screen; another site opens in a new tab
  a: ({ node: _node, href, children, ...props }) =>
    isAppPath(href) ? (
      <Link to={href} className="font-medium text-link underline decoration-link/40 underline-offset-2 hover:decoration-link">
        {children}
      </Link>
    ) : (
      <a href={href} className="text-link underline underline-offset-2" target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    ),
  blockquote: ({ node: _node, ...props }) => <blockquote className="my-3 max-w-[75ch] border-l-2 border-border pl-3 text-ink-muted" {...props} />,
  hr: () => <hr className="my-4 border-line" />,
  // inline code: the names the model cites (brecha_panel, codigo). a fenced block keeps its own lines
  code: ({ node: _node, className, ...props }) => <code className={cn('rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.85em]', className)} {...props} />,
  pre: ({ node: _node, ...props }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-surface-muted p-3 text-xs [&_code]:bg-transparent [&_code]:p-0" {...props} />
  ),
  // a wide table scrolls inside the answer, never the page
  table: ({ node: _node, ...props }) => (
    <div data-ui="agent-table" className="my-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead className="bg-table-head" {...props} />,
  tbody: ({ node: _node, ...props }) => <tbody className="[&>tr:nth-child(even)]:bg-table-stripe [&>tr:last-child>td]:border-b-0" {...props} />,
  th: ({ node: _node, className, style, ...props }) => (
    <th style={style} className={cn('border-b border-border px-3 py-2 text-left font-semibold whitespace-nowrap text-ink', className)} {...props} />
  ),
  td: Cell
}

// the model's answer: github-flavoured markdown (tables, lists, strikethrough), no raw html. prose keeps a reading
// measure (75ch); a table takes the whole width of the column, and scrolls inside it when wider
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div data-ui="agent-markdown" className={cn('text-[0.95rem] leading-relaxed text-ink', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

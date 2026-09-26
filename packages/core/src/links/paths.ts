// '/' + the non-empty parts, each without its own leading/trailing slashes
export function joinPath(...parts: string[]): string {
  return `/${parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')}`
}

// react-router pattern -> url. a missing parameter is a bug in the caller, not an empty segment
export function fillPath(pattern: string, params: Record<string, string> = {}): string {
  return pattern
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return segment
      const name = segment.slice(1)
      const value = params[name]
      if (value === undefined || value === '') throw new Error(`wasichai links: '${pattern}' needs :${name}`)
      return encodeURIComponent(value)
    })
    .join('/')
}

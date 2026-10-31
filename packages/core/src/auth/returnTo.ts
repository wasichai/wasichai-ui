// throwaway origin: only used to see whether the value escapes it
const BASE = 'http://wasichai.invalid'

// the router path to go back to after signing in, or null when it is not safe (open redirect, login loop).
// only '/…' app paths: no scheme, no host, not '//' or '/\'. the router puts it under the basename itself
export function safeReturnTo(value: string | null | undefined, loginPath: string): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return null
  }
  // the parser drops tabs and newlines and reads '\' as '/', so '/\t/evil.test' only shows its host here
  if (url.origin !== BASE) return null
  // router matching ignores case and a trailing slash
  const path = url.pathname.replace(/\/+$/, '').toLowerCase()
  if (path === loginPath.replace(/\/+$/, '').toLowerCase()) return null
  return url.pathname + url.search + url.hash
}

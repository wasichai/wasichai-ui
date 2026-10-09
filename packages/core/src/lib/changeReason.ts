// mirror of the server's ChangeReason.kt: same header, same limit, same refused characters
export const CHANGE_REASON_HEADER = 'X-Change-Reason'
export const CHANGE_REASON_MAX_LENGTH = 500

export type ReasonProblem = 'REQUIRED' | 'TOO_LONG' | 'CONTROL'

// tab, \n and \r are text; every other C0/C1 control is refused
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

export function normalizeReason(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? ''
  return trimmed ? trimmed : null
}

// for a required reason: what the server would refuse, checked before anything is sent
export function reasonProblem(raw: string | null | undefined): ReasonProblem | null {
  const reason = normalizeReason(raw)
  if (reason === null) return 'REQUIRED'
  // code points, like the server, not utf-16 units: an emoji counts once
  if (Array.from(reason).length > CHANGE_REASON_MAX_LENGTH) return 'TOO_LONG'
  if (CONTROL.test(reason)) return 'CONTROL'
  return null
}

// RFC 8187 always, ascii too: browsers refuse non latin-1 header values, one code path keeps it simple.
// a lone surrogate would make encodeURIComponent throw, so it becomes U+FFFD first (lib is ES2022: no toWellFormed)
export function changeReasonHeader(reason: string | null | undefined): Record<string, string> {
  const normalized = normalizeReason(reason)
  if (normalized === null) return {}
  return { [CHANGE_REASON_HEADER]: `UTF-8''${encodeURIComponent(normalized.replace(LONE_SURROGATE, '�'))}` }
}

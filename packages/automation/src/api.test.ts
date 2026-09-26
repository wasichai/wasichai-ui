import { describe, expect, it } from 'vitest'
import { documentTypeOptionsQuery, workflowOutlineQuery } from './api'

// both reads belong to other modules. the keys must stay theirs, or the two caches split; and an
// absent module answers 404, which is an answer: retrying it only delays the empty picker.
describe('reads borrowed from other modules', () => {
  it('reads the workflow under the same key and path as the workflow module, without retrying a 404', () => {
    const options = workflowOutlineQuery('predio')
    expect(options.queryKey).toEqual(['workflow', 'predio'])
    expect(options.retry).toBe(false)
    expect(options.enabled).toBe(true)
    expect(workflowOutlineQuery(undefined).enabled).toBe(false)
  })

  it('reads document types under the same key as the documents module, without retrying a 404', () => {
    const options = documentTypeOptionsQuery('predio')
    expect(options.queryKey).toEqual(['document-types', 'predio'])
    expect(options.retry).toBe(false)
    expect(documentTypeOptionsQuery('').enabled).toBe(false)
  })
})

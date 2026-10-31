import { describe, expect, it } from 'vitest'
import { safeReturnTo } from './returnTo'

const login = '/login'

describe('safeReturnTo', () => {
  it('keeps an app-relative path with its search and hash', () => {
    expect(safeReturnTo('/courses/7?tab=2#enroll', login)).toBe('/courses/7?tab=2#enroll')
    expect(safeReturnTo('/', login)).toBe('/')
  })

  it('folds dot segments so the target stays a plain app path', () => {
    expect(safeReturnTo('/a/../courses/7', login)).toBe('/courses/7')
    expect(safeReturnTo('/../../courses', login)).toBe('/courses')
  })

  it.each([
    ['nothing', null],
    ['an empty value', ''],
    ['another origin', 'https://evil.test'],
    ['a protocol-relative url', '//evil.test'],
    ['a backslash host', '/\\evil.test'],
    ['a tab hidden before the host', '/\t/evil.test'],
    ['a script url', 'javascript:alert(1)'],
    ['a data url', 'data:text/html,hi'],
    ['a relative path', 'courses/7'],
    ['a path with spaces in front', ' /courses'],
    ['the login page', '/login'],
    ['the login page with a query', '/login?returnTo=%2Fcourses'],
    ['the login page with a trailing slash', '/login/'],
    ['the login page in capitals', '/LOGIN'],
    ['the login page through dot segments', '/a/../login']
  ])('refuses %s', (_, value) => {
    expect(safeReturnTo(value, login)).toBeNull()
  })
})

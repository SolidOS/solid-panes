import { describe, expect, it } from 'vitest'
import { resolveSource } from '../../../src/navigation/options'

describe('resolveSource', () => {
  it.each([
    [undefined, 'default'],
    [{}, 'default'],
    [{ source: 'default' }, 'default'],
    [{ source: 'accountMenu' }, 'accountMenu']
  ] as const)('reads the options %j as %s', (argument, expected) => {
    expect(resolveSource(argument)).toBe(expected)
  })

  it('still reads the old showNavbar boolean', () => {
    expect(resolveSource(true)).toBe('default')
    expect(resolveSource(false)).toBe('accountMenu')
  })

  it('reads any other falsy value like the old default parameter did', () => {
    expect(resolveSource(null)).toBe('accountMenu')
  })
})

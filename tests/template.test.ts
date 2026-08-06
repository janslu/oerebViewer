import { describe, it, expect } from 'vitest'
import { stringTemplate } from '~/helpers/template'

describe('stringTemplate', () => {
  it('replaces placeholders with values', () => {
    expect(
      stringTemplate('https://service/extract?egrid={{EGRID}}&lang={{language}}', {
        EGRID: 'CH123456789012',
        language: 'de',
      }),
    ).toBe('https://service/extract?egrid=CH123456789012&lang=de')
  })

  it('keeps unknown placeholders untouched', () => {
    expect(stringTemplate('{{known}} and {{unknown}}', { known: 'value' })).toBe(
      'value and {{unknown}}',
    )
  })

  it('replaces repeated placeholders', () => {
    expect(stringTemplate('{{a}}-{{a}}', { a: 'x' })).toBe('x-x')
  })

  it('supports keys with spaces', () => {
    expect(stringTemplate('{{animal action}}', { 'animal action': 'jumps' })).toBe('jumps')
  })

  it('throws when the template is not a string', () => {
    // @ts-expect-error intentional wrong type
    expect(() => stringTemplate(undefined, {})).toThrow()
  })
})

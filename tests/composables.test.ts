import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useMultilingualText } from '~/composables/useMultilingualText'
import { useWordbreak } from '~/composables/useWordbreak'
import { useDecent } from '~/composables/useDecent'

describe('useMultilingualText', () => {
  const { multilingualText } = useMultilingualText()

  it('takes the first entry of a text array', () => {
    expect(multilingualText([
      { Language: 'de', Text: 'Nutzungsplanung' },
      { Language: 'fr', Text: 'Plans d\'affectation' },
    ])).toBe('Nutzungsplanung')
  })

  it('returns an empty string for an empty array', () => {
    expect(multilingualText([])).toBe('')
  })

  it('unwraps single text objects', () => {
    expect(multilingualText({ Language: 'de', Text: 'Hallo' })).toBe('Hallo')
    expect(multilingualText({ Text: '' } as never)).toBe('')
  })

  it('passes plain strings through and defaults nullish values', () => {
    expect(multilingualText('plain')).toBe('plain')
    expect(multilingualText(null)).toBe('')
    expect(multilingualText(undefined)).toBe('')
  })
})

describe('useWordbreak', () => {
  const { wordbreak } = useWordbreak()

  it('adds soft hyphen break points after underscores', () => {
    expect(wordbreak('ch.BelasteteStandorte_Zustaendigkeit')).toBe(
      'ch.BelasteteStandorte_­Zustaendigkeit',
    )
  })

  it('leaves strings without underscores unchanged', () => {
    expect(wordbreak('ch.Nutzungsplanung')).toBe('ch.Nutzungsplanung')
  })

  it('passes non-string values through', () => {
    expect(wordbreak(42)).toBe(42)
    expect(wordbreak(null)).toBeNull()
  })
})

describe('useDecent', () => {
  function makeChild(decent: boolean) {
    return defineComponent({
      setup() {
        const { isDecent } = useDecent({ decent })
        return () => h('span', { 'data-decent': String(isDecent.value) })
      },
    })
  }

  function makeParent(decent: boolean, child: ReturnType<typeof makeChild>) {
    return defineComponent({
      setup() {
        useDecent({ decent })
        return () => h('div', [h(child)])
      },
    })
  }

  it('is decent when its own prop says so', () => {
    const wrapper = mount(makeChild(true))

    expect(wrapper.get('span').attributes('data-decent')).toBe('true')
  })

  it('inherits decent from the parent', () => {
    const wrapper = mount(makeParent(true, makeChild(false)))

    expect(wrapper.get('span').attributes('data-decent')).toBe('true')
  })

  it('is not decent when neither itself nor the parent is', () => {
    const wrapper = mount(makeParent(false, makeChild(false)))

    expect(wrapper.get('span').attributes('data-decent')).toBe('false')
  })
})

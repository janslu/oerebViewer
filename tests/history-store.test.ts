import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from '~/store/history'
import type { Extract } from '~/types/extractdata'

function makeExtract(egrid: string): Extract {
  return {
    RealEstate: {
      EGRID: egrid,
      Number: '1',
      MunicipalityName: 'Bern',
    },
  } as unknown as Extract
}

describe('history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds properties with a language-prefixed url', () => {
    const store = useHistoryStore()
    store.addProperty(makeExtract('CH1'), 'fr')

    expect(store.properties).toHaveLength(1)
    expect(store.properties[0]).toMatchObject({
      EGRID: 'CH1',
      url: '/fr/d/CH1',
    })
  })

  it('uses no prefix for the default language', () => {
    const store = useHistoryStore()
    store.addProperty(makeExtract('CH1'), 'de')

    expect(store.properties[0].url).toBe('/d/CH1')
  })

  it('moves re-added properties to the front without duplicating', () => {
    const store = useHistoryStore()
    store.addProperty(makeExtract('CH1'), 'de')
    store.addProperty(makeExtract('CH2'), 'de')
    store.addProperty(makeExtract('CH1'), 'de')

    expect(store.properties.map(p => p.EGRID)).toEqual(['CH1', 'CH2'])
  })

  it('keeps at most 10 entries', () => {
    const store = useHistoryStore()
    for (let i = 0; i < 12; i++) {
      store.addProperty(makeExtract(`CH${i}`), 'de')
    }

    expect(store.properties).toHaveLength(10)
    expect(store.properties[0].EGRID).toBe('CH11')
  })

  it('ignores extracts without real estate data', () => {
    const store = useHistoryStore()
    store.addProperty({} as Extract, 'de')

    expect(store.properties).toHaveLength(0)
  })
})

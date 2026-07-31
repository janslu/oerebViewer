import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const routerPush = vi.fn()
const getExtractById = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: ref('de') }),
}))

vi.mock('~/composables/useOereb', () => ({
  useOereb: () => ({ getExtractById }),
}))

const services = vi.hoisted(() => ({
  pdf: {} as Record<string, unknown>,
  external: {} as Record<string, unknown>,
  owner: {} as Record<string, unknown>,
  reset() {
    this.pdf = { getPDFUrlByEGRID: 'https://pdf.example/extract?egrid={{EGRID}}&lang={{language}}' }
    this.external = {}
    this.owner = {}
  },
}))
services.reset()

vi.mock('~/config/setup', () => ({
  getPdfService: async () => services.pdf,
  getExternalService: async () => services.external,
  getOwnerService: async () => services.owner,
}))

const { usePropertyStore } = await import('~/store/property')
const { useNotificationStore } = await import('~/store/notification')
const { useHistoryStore } = await import('~/store/history')

function makeExtract(overrides: Record<string, unknown> = {}) {
  return {
    RealEstate: {
      EGRID: 'CH951946873506',
      Number: '2711',
      MunicipalityName: 'Bern',
      Limit: { type: 'MultiPolygon', coordinates: [] },
      RestrictionOnLandownership: [],
      ...((overrides.RealEstate as Record<string, unknown>) || {}),
    },
    CreationDate: '2026-07-31',
    ...overrides,
  }
}

function lastMessage() {
  const notificationStore = useNotificationStore()
  return notificationStore.messages[notificationStore.messages.length - 1]
}

describe('property store, loading extracts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    services.reset()
  })

  it('loads an extract, renders service urls and notifies success', async () => {
    const store = usePropertyStore()
    await store.initializeStore()
    getExtractById.mockResolvedValue({ extract: makeExtract() })

    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    expect(store.extract?.RealEstate.EGRID).toBe('CH951946873506')
    expect(store.extract?.pdfExtractUrl).toBe(
      'https://pdf.example/extract?egrid=CH951946873506&lang=de',
    )
    expect(store.extractFeatures).toEqual({ type: 'MultiPolygon', coordinates: [] })
    expect(store.loading).toBe(false)

    expect(useHistoryStore().properties[0].EGRID).toBe('CH951946873506')
    expect(lastMessage()).toMatchObject({ type: 'success', text: 'notification_load_success' })
  })

  it('maps a 204 response to the not-found warning', async () => {
    const store = usePropertyStore()
    getExtractById.mockRejectedValue(
      Object.assign(new Error('204 No Content'), { response: { status: 204 } }),
    )

    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    expect(lastMessage()).toMatchObject({ type: 'warning', text: 'oereb_service_204' })
    expect(store.loading).toBe(false)
  })

  it('maps a 204 for temporary parcel numbers to the dedicated warning without vars', async () => {
    const store = usePropertyStore()
    getExtractById.mockRejectedValue(
      Object.assign(new Error('Empty response'), {
        response: { status: 204 },
        isTempParcel: true,
      }),
    )

    await store.loadExtractByIdAndLanguage({ EGRID: 'BE0012TEMP123-1-0', language: 'de' })

    expect(lastMessage()).toMatchObject({ type: 'warning', text: 'oereb_service_204_temp', vars: {} })
  })

  it('maps a 500 response to the server error warning', async () => {
    const store = usePropertyStore()
    getExtractById.mockRejectedValue(
      Object.assign(new Error('Server error'), { response: { status: 500 } }),
    )

    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    expect(lastMessage()).toMatchObject({ type: 'warning', text: 'oereb_service_500' })
  })

  it('maps network errors to the not-available warning', async () => {
    const store = usePropertyStore()
    const error = new Error('fetch failed')
    error.name = 'FetchError'
    getExtractById.mockRejectedValue(error)

    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    expect(lastMessage()).toMatchObject({ type: 'warning', text: 'oereb_service_not_available' })
  })

  it('maps unexpected response structures to the invalid data warning', async () => {
    const store = usePropertyStore()
    getExtractById.mockResolvedValue({ unexpected: true })

    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    expect(lastMessage()).toMatchObject({ type: 'warning', text: 'oereb_service_invalid_data' })
  })

  it('navigates to the extract url with a language prefix', () => {
    const store = usePropertyStore()
    store.showExtractById('CH1')

    expect(routerPush).toHaveBeenCalledWith('/d/CH1')
  })

  it('detects temporary parcels from the egrid pattern alone', async () => {
    const store = usePropertyStore()
    getExtractById.mockRejectedValue(
      Object.assign(new Error('204 No Content'), { response: { status: 204 } }),
    )

    await store.loadExtractByIdAndLanguage({ EGRID: 'BE0012TEMP123-1-0', language: 'de' })

    expect(lastMessage()).toMatchObject({ type: 'warning', text: 'oereb_service_204_temp' })
  })

  it('renders external and owner service urls when configured', async () => {
    services.external = {
      getExternalUrlByEGRID: 'https://geo.example/call?egrid={{EGRID}}&project=x_{{languageUppercase}}',
    }
    services.owner = {
      getOwnerUrlByEGRID: 'https://owner.example/?bfs={{municipalityCode}}&nr={{number}}',
    }
    const store = usePropertyStore()
    await store.initializeStore()
    getExtractById.mockResolvedValue({
      extract: makeExtract({
        RealEstate: {
          EGRID: 'CH951946873506',
          Number: '2711',
          MunicipalityCode: '351',
          RestrictionOnLandownership: [],
        },
      }),
    })

    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    expect(store.extract?.externalUrl).toBe(
      'https://geo.example/call?egrid=CH951946873506&project=x_DE',
    )
    expect(store.extract?.ownerUrl).toBe('https://owner.example/?bfs=351&nr=2711')
  })

  it('reloads the current extract in another language', async () => {
    const store = usePropertyStore()
    getExtractById.mockResolvedValue({ extract: makeExtract() })
    await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })

    await store.reloadExtract('fr')

    expect(getExtractById).toHaveBeenLastCalledWith({ EGRID: 'CH951946873506', language: 'fr' })
  })

  it('does nothing on reload when no extract is loaded', async () => {
    const store = usePropertyStore()

    await store.reloadExtract('fr')

    expect(getExtractById).not.toHaveBeenCalled()
  })

  it('starts an extraction for hash paths in the /d/EGRID format', async () => {
    const store = usePropertyStore()
    getExtractById.mockResolvedValue({ extract: makeExtract() })

    await store.showActiveExtract('/fr/d/CH951946873506')

    expect(getExtractById).toHaveBeenCalledWith({ EGRID: 'CH951946873506', language: 'de' })
  })

  it('ignores hash paths without an egrid', async () => {
    const store = usePropertyStore()

    await store.showActiveExtract('/fr')

    expect(getExtractById).not.toHaveBeenCalled()
  })

  it('exposes the extract only when loading is finished', async () => {
    const store = usePropertyStore()
    let resolveFetch: (value: unknown) => void
    getExtractById.mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve
    }))

    const loading = store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })
    expect(store.loadedExtract).toBeNull()

    resolveFetch!({ extract: makeExtract() })
    await loading

    expect(store.loadedExtract?.RealEstate.EGRID).toBe('CH951946873506')
  })

  it('restores the plot features after a refocus', async () => {
    vi.useFakeTimers()
    try {
      const store = usePropertyStore()
      getExtractById.mockResolvedValue({ extract: makeExtract() })
      await store.loadExtractByIdAndLanguage({ EGRID: 'CH951946873506', language: 'de' })
      const features = store.extractFeatures

      store.refocusFeatures()
      expect(store.extractFeatures).toBeNull()

      vi.advanceTimersByTime(100)
      expect(store.extractFeatures).toEqual(features)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('property store, restriction selectors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function restriction(overrides: Record<string, unknown> = {}) {
    return {
      Theme: { Code: 'ch.Nutzungsplanung' },
      Lawstatus: { Code: 'inKraft' },
      TypeCode: 'N110',
      ...overrides,
    }
  }

  async function storeWithRestrictions(restrictions: unknown[]) {
    const store = usePropertyStore()
    await store.setExtract({
      extract: makeExtract({
        RealEstate: { RestrictionOnLandownership: restrictions },
      }) as never,
      language: 'de',
    })
    return store
  }

  it('combines restrictions with the same type code and law status', async () => {
    const store = await storeWithRestrictions([
      restriction({ NrOfPoints: 1, AreaShare: 100, LegalProvisions: [{ Title: 'a' }] }),
      restriction({ NrOfPoints: 2, AreaShare: 50, LegalProvisions: [{ Title: 'b' }] }),
    ])

    const combined = store.getRestrictionsByThemeCode('ch.Nutzungsplanung')

    expect(combined).toHaveLength(1)
    expect(combined?.[0]).toMatchObject({ NrOfPoints: 3, AreaShare: 150 })
    expect(combined?.[0].LegalProvisions).toHaveLength(2)
  })

  it('keeps restrictions with different law status separate and filters by it', async () => {
    const store = await storeWithRestrictions([
      restriction({ NrOfPoints: 1 }),
      restriction({ NrOfPoints: 2, Lawstatus: { Code: 'AenderungMitVorwirkung' } }),
    ])

    expect(store.getRestrictionsByThemeCode('ch.Nutzungsplanung')).toHaveLength(2)
    expect(store.getRestrictionsByThemeCode('ch.Nutzungsplanung', 'inKraft')).toHaveLength(1)
  })

  it('finds restrictions by theme sub code', async () => {
    const store = await storeWithRestrictions([
      restriction({ Theme: { Code: 'ch.Main', SubCode: 'ch.Main.Sub' } }),
    ])

    expect(store.getRestrictionsByThemeCode('ch.Main.Sub')).toHaveLength(1)
    expect(store.themeByCode('ch.Main.Sub')?.Theme.SubCode).toBe('ch.Main.Sub')
  })

  it('collects unique law states per theme', async () => {
    const store = await storeWithRestrictions([
      restriction(),
      restriction({ TypeCode: 'N120' }),
      restriction({ Lawstatus: { Code: 'AenderungMitVorwirkung' } }),
    ])

    const states = store.lawStatesByThemeCode('ch.Nutzungsplanung')

    expect(states?.map(s => s.Code)).toEqual(['inKraft', 'AenderungMitVorwirkung'])
  })

  it('collects unique sub themes for a main theme code', async () => {
    const store = await storeWithRestrictions([
      restriction({ Theme: { Code: 'ch.Main', SubCode: 'ch.Main.A' } }),
      restriction({ Theme: { Code: 'ch.Main', SubCode: 'ch.Main.A' }, TypeCode: 'N120' }),
      restriction({ Theme: { Code: 'ch.Main', SubCode: 'ch.Main.B' } }),
      restriction({ Theme: { Code: 'ch.Other', SubCode: 'ch.Other.C' } }),
      restriction(),
    ])

    const subThemes = await store.getSubThemesByCode('ch.Main')

    expect(subThemes?.map(t => t.SubCode)).toEqual(['ch.Main.A', 'ch.Main.B'])
  })

  it('exposes the loaded extract through the useLoadedExtract composable', async () => {
    const store = await storeWithRestrictions([])
    const { useLoadedExtract } = await import('~/composables/useLoadedExtract')

    const { loadedExtract } = useLoadedExtract()

    expect(loadedExtract.value).toBe(store.extract)
  })
})

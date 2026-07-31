import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const getEGRID = vi.fn()
const routerPush = vi.fn()

// the auto-load path instantiates the property store, which needs router and i18n
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: ref('de'), t: (key: string) => key }),
}))

vi.mock('~/config/setup', () => ({
  getView: async () => ({ zoom: 10, minZoom: 9, maxZoom: 22.5 }),
  getSearchService: async () => ({
    search: 'https://search.example/find?q={{query}}',
    parser: (response: Array<Record<string, unknown>>) =>
      response.map(item => ({
        id: item.id,
        label: item.label,
        lat: item.lat,
        lon: item.lon,
        x: item.x,
        y: item.y,
      })),
    isHtmlFormatted: false,
  }),
  getEsriTokenService: async () => ({}),
}))

vi.mock('~/composables/useOereb', () => ({
  useOereb: () => ({ getEGRID }),
}))

const { useMapStore } = await import('~/store/map')

describe('map store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initialization and zoom', () => {
    it('applies the view config', async () => {
      const store = useMapStore()
      await store.initializeStore()

      expect(store.zoom).toBe(10)
      expect(store.minZoom).toBe(9)
      expect(store.maxZoom).toBe(22.5)
    })

    it('clamps zoom actions to the configured limits', async () => {
      const store = useMapStore()
      await store.initializeStore()

      store.setZoom(22.5)
      store.zoomInActionClicked()
      expect(store.zoom).toBe(22.5)

      store.setZoom(9)
      store.zoomOutActionClicked()
      expect(store.zoom).toBe(9)

      store.zoomInActionClicked()
      expect(store.zoom).toBe(9.5)
    })
  })

  describe('search', () => {
    it('queries the configured endpoint and parses results', async () => {
      const store = useMapStore()
      await store.initializeStore()

      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => [
          { id: 1, label: 'Bern', lat: 46.94, lon: 7.44, x: 2600000, y: 1199000 },
        ],
      })
      vi.stubGlobal('fetch', fetchMock)

      await store.updateSearchQuery('Bern')

      expect(fetchMock).toHaveBeenCalledWith('https://search.example/find?q=Bern')
      expect(store.searchResults).toHaveLength(1)
      expect(store.searchResults[0]).toMatchObject({ label: 'Bern', x: 2600000 })
      expect(store.isSearchResultLoading).toBe(false)
    })

    it('clears results when the request fails', async () => {
      const store = useMapStore()
      await store.initializeStore()
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

      await expect(store.updateSearchQuery('Bern')).rejects.toThrow('network down')
      expect(store.searchResults).toEqual([])
      expect(store.isSearchResultLoading).toBe(false)
    })

    it('resolves coordinate queries locally without calling the search service', async () => {
      const store = useMapStore()
      await store.initializeStore()
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await store.updateSearchQuery('2600983, 1197426')

      expect(fetchMock).not.toHaveBeenCalled()
      expect(store.searchResults).toHaveLength(1)
      expect(store.searchResults[0]).toMatchObject({
        id: 'coordinate-2600983-1197426',
        label: '2600983, 1197426 (search_coordinate_lv95)',
        x: 2600983,
        y: 1197426,
      })
      expect(store.searchResults[0].lat).toBeCloseTo(46.92792853, 4)
      expect(store.searchResults[0].lon).toBeCloseTo(7.45154007, 4)
      expect(store.isSearchResultLoading).toBe(false)
    })

    it('resolves wgs84 coordinate queries even when no search service is configured', async () => {
      const store = useMapStore()
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await store.updateSearchQuery('46.94304142827599, 7.440462684216267')

      expect(fetchMock).not.toHaveBeenCalled()
      expect(store.searchResults).toHaveLength(1)
      expect(store.searchResults[0].label).toContain('search_coordinate_wgs84')
    })

    it('ignores empty queries', async () => {
      const store = useMapStore()
      await store.initializeStore()
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await store.updateSearchQuery('')

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('search result selection', () => {
    it('jumps directly to swiss coordinates when the result provides them', async () => {
      const store = useMapStore()
      getEGRID.mockResolvedValue([])

      await store.searchResultSelected({
        x: 2759410,
        y: 1191510,
        lon: 9.529,
        lat: 46.855,
      })

      expect(store.jumpToCoordinates).toEqual([2759410, 1191510])
    })

    it('converts lon/lat when the result has no swiss coordinates', async () => {
      const store = useMapStore()
      getEGRID.mockResolvedValue([])

      await store.searchResultSelected({ lon: 7.438632495, lat: 46.951082877 })

      const [x, y] = store.jumpToCoordinates!
      expect(Math.abs(x - 2600000)).toBeLessThan(200)
      expect(Math.abs(y - 1200000)).toBeLessThan(200)
    })

    it('auto-loads the extract when exactly one egrid is found', async () => {
      const store = useMapStore()
      getEGRID.mockResolvedValue([{ egrid: 'CH951946873506', limit: {} }])

      await store.setPreviewCoordinate({
        globalCoordinate: { longitude: 7.44, latitude: 46.94 },
        swissCoordinate: { longitude: 2600983, latitude: 1197426 },
      })

      // navigation to the extract was triggered and the preview cleared
      expect(routerPush).toHaveBeenCalledWith('/d/CH951946873506')
      expect(store.previewEGRID).toBeNull()
      expect(store.previewCoordinates).toBeNull()
    })

    it('keeps the preview open when multiple egrids are found', async () => {
      const store = useMapStore()
      getEGRID.mockResolvedValue([
        { egrid: 'CH1', limit: { type: 'MultiPolygon' } },
        { egrid: 'CH2', limit: {} },
      ])

      await store.setPreviewCoordinate({
        globalCoordinate: { longitude: 7.44, latitude: 46.94 },
        swissCoordinate: { longitude: 2600983, latitude: 1197426 },
      })

      expect(store.previewEGRID).toHaveLength(2)
      expect(store.previewFeatures).toEqual({ type: 'MultiPolygon' })
    })
  })
})

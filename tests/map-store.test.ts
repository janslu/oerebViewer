import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

const configState = vi.hoisted(() => ({
  boundary: null as { coordinates: number[][][][] } | null,
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
  getCoordinateBoundary: async () => configState.boundary,
}))

vi.mock('~/composables/useOereb', () => ({
  useOereb: () => ({ getEGRID }),
}))

const fetchEsriToken = vi.hoisted(() => vi.fn())

vi.mock('~/services/esritoken', () => ({
  fetchEsriToken,
}))

const { useMapStore } = await import('~/store/map')

describe('map store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    configState.boundary = null
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

    it('marks coordinates outside the configured boundary as disabled', async () => {
      // 10 x 10 km square around bern city
      configState.boundary = {
        coordinates: [[[
          [2600000, 1190000],
          [2610000, 1190000],
          [2610000, 1200000],
          [2600000, 1200000],
        ]]],
      }
      const store = useMapStore()
      await store.initializeStore()
      vi.stubGlobal('fetch', vi.fn())

      // chur, far outside the square
      await store.updateSearchQuery('2759410, 1191510')

      expect(store.searchResults).toHaveLength(1)
      expect(store.searchResults[0]).toMatchObject({
        label: '2759410, 1191510 (search_coordinate_outside)',
        $isDisabled: true,
      })

      // inside the square resolves normally
      await store.updateSearchQuery('2600983, 1197426')
      expect(store.searchResults[0]).toMatchObject({ x: 2600983, y: 1197426 })
      expect(store.searchResults[0].$isDisabled).toBeUndefined()
    })

    it('ignores selection of disabled results', async () => {
      const store = useMapStore()

      await store.searchResultSelected({ $isDisabled: true, label: 'outside' })

      expect(store.selectedSearchResult).toBeNull()
      expect(store.jumpToCoordinates).toBeNull()
      expect(getEGRID).not.toHaveBeenCalled()
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

    it('drops stale service responses that resolve after a newer coordinate query', async () => {
      const store = useMapStore()
      await store.initializeStore()

      let resolveSlowFetch: (value: unknown) => void
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveSlowFetch = resolve
        }),
      ))

      // a slow text query is in flight when the finished coordinate pair arrives
      const slowQuery = store.updateSearchQuery('2600983')
      await store.updateSearchQuery('2600983, 1197426')
      expect(store.searchResults[0].id).toBe('coordinate-2600983-1197426')

      resolveSlowFetch!({
        json: async () => [
          { id: 1, label: 'stale', lat: 46, lon: 7, x: 2600000, y: 1199000 },
        ],
      })
      await slowQuery

      expect(store.searchResults).toHaveLength(1)
      expect(store.searchResults[0].id).toBe('coordinate-2600983-1197426')
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

    it('warns and clears the preview when the egrid lookup fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useMapStore()
      getEGRID.mockRejectedValue(
        Object.assign(new Error('server error'), { response: { status: 500 } }),
      )

      await store.setPreviewCoordinate({
        globalCoordinate: { longitude: 7.44, latitude: 46.94 },
        swissCoordinate: { longitude: 2600983, latitude: 1197426 },
      })

      expect(store.previewCoordinates).toBeNull()
      expect(store.previewEGRID).toBeNull()

      const { useNotificationStore } = await import('~/store/notification')
      const messages = useNotificationStore().messages
      expect(messages[messages.length - 1]).toMatchObject({
        type: 'warning',
        text: 'oereb_service_500',
      })
      consoleError.mockRestore()
    })

    it('maps 204 lookup failures to the dedicated warning', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useMapStore()
      getEGRID.mockRejectedValue(
        Object.assign(new Error('no content'), { response: { status: 204 } }),
      )

      await store.setPreviewCoordinate({
        globalCoordinate: { longitude: 7.44, latitude: 46.94 },
        swissCoordinate: { longitude: 2600983, latitude: 1197426 },
      })

      const { useNotificationStore } = await import('~/store/notification')
      const messages = useNotificationStore().messages
      expect(messages[messages.length - 1]).toMatchObject({ text: 'oereb_service_204' })
      consoleError.mockRestore()
    })

    it('only clears the selection when null is selected', async () => {
      const store = useMapStore()
      store.setJumpToCoordinates([1, 2])

      await store.searchResultSelected(null as never)

      expect(store.selectedSearchResult).toBeNull()
      expect(store.jumpToCoordinates).toEqual([1, 2])
      expect(getEGRID).not.toHaveBeenCalled()
    })
  })

  describe('view type and jumps', () => {
    it('switches between map and satellite view', () => {
      const store = useMapStore()

      expect(store.isMapView).toBe(true)
      store.setSatelliteView()
      expect(store.isSatelliteView).toBe(true)
      expect(store.isMapView).toBe(false)
      store.setMapView()
      expect(store.isMapView).toBe(true)
    })

    it('jumps to swiss coordinates directly', () => {
      const store = useMapStore()

      store.jumpToSwissCoordinates([2600000, 1200000])

      expect(store.jumpToCoordinates).toEqual([2600000, 1200000])
    })

    it('delegates center object clicks to the property store refocus', async () => {
      const store = useMapStore()
      const { usePropertyStore } = await import('~/store/property')
      const propertyStore = usePropertyStore()
      const refocus = vi.spyOn(propertyStore, 'refocusFeatures')

      store.centerObjectActionClicked()

      expect(refocus).toHaveBeenCalled()
    })
  })

  describe('side panel and search visibility', () => {
    it('toggles the glossary panel', () => {
      const store = useMapStore()

      store.toggleGlossaryVisibility()
      expect(store.contentType).toBe('glossary')
      store.toggleGlossaryVisibility()
      expect(store.contentType).toBe('map')
    })

    it('toggles the imprint panel and closes back to the map', () => {
      const store = useMapStore()

      store.toggleImprintAndLegalVisibility()
      expect(store.contentType).toBe('imprintAndLegal')
      store.closeImprintAndLegal()
      expect(store.contentType).toBe('map')

      store.toggleGlossaryVisibility()
      store.closeGlossary()
      expect(store.contentType).toBe('map')
    })

    it('shows, hides and toggles the search control', () => {
      const store = useMapStore()

      store.hideSearch()
      expect(store.isSearchVisible).toBe(false)
      store.showSearch()
      expect(store.isSearchVisible).toBe(true)
      store.toggleSearchVisibility()
      expect(store.isSearchVisible).toBe(false)
    })
  })

  describe('esri token updater', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('fetches a token immediately and refreshes it once expired', async () => {
      const store = useMapStore()
      fetchEsriToken.mockResolvedValue({ token: 'first', expires: Date.now() + 60_000 })

      await store.enableTokenUpdater()
      expect(store.esriToken).toBe('first')
      expect(fetchEsriToken).toHaveBeenCalledTimes(1)

      // token still valid - interval tick must not refetch
      await vi.advanceTimersByTimeAsync(30_000)
      expect(fetchEsriToken).toHaveBeenCalledTimes(1)

      // token expired - next tick refreshes
      fetchEsriToken.mockResolvedValue({ token: 'second', expires: Date.now() + 120_000 })
      await vi.advanceTimersByTimeAsync(31_000)
      expect(fetchEsriToken).toHaveBeenCalledTimes(2)
      expect(store.esriToken).toBe('second')

      store.disableTokenUpdater()
      await vi.advanceTimersByTimeAsync(120_000)
      expect(fetchEsriToken).toHaveBeenCalledTimes(2)
    })

    it('updates the token on demand', async () => {
      const store = useMapStore()
      fetchEsriToken.mockResolvedValue({ token: 'manual', expires: 42 })

      await store.updateToken()

      expect(store.esriToken).toBe('manual')
      expect(store.esriTokenExpiredAt).toBe(42)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

const state = vi.hoisted(() => ({
  service: {} as Record<string, unknown>,
}))

vi.mock('~/config/setup', () => ({
  getOerebService: async () => state.service,
}))

const { useOereb } = await import('~/composables/useOereb')

describe('useOereb', () => {
  beforeEach(() => {
    state.service = {
      getEGRIDByCoordinate: 'https://oereb.example/getegrid/json?GNSS={{latitude}},{{longitude}}',
      getExtractByEGRID: 'https://oereb.example/extract/json?EGRID={{EGRID}}&LANG={{language}}',
    }
  })

  describe('getEGRID', () => {
    it('renders the template url and unwraps the response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        GetEGRIDResponse: [{ egrid: 'CH1' }],
      })
      vi.stubGlobal('$fetch', fetchMock)

      const result = await useOereb().getEGRID({ longitude: 7.44, latitude: 46.94 })

      expect(fetchMock).toHaveBeenCalledWith('https://oereb.example/getegrid/json?GNSS=46.94,7.44')
      expect(result).toEqual([{ egrid: 'CH1' }])
    })

    it('returns false for empty responses', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(undefined))

      expect(await useOereb().getEGRID({ longitude: 7, latitude: 46 })).toBe(false)
    })

    it('returns false for unexpected response shapes', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ something: 'else' }))

      expect(await useOereb().getEGRID({ longitude: 7, latitude: 46 })).toBe(false)
    })

    it('rejects when the service is not configured', async () => {
      state.service = {}

      await expect(useOereb().getEGRID({ longitude: 7, latitude: 46 })).rejects.toThrow(
        'oerebService.getEGRIDByCoordinate is required',
      )
    })

    it('rejects when the endpoint is not a template string', async () => {
      state.service = { getEGRIDByCoordinate: 42 }

      await expect(useOereb().getEGRID({ longitude: 7, latitude: 46 })).rejects.toThrow(
        'must be a string',
      )
    })
  })

  describe('getExtractById', () => {
    it('renders the template url and unwraps GetExtractByIdResponse', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        GetExtractByIdResponse: { extract: { RealEstate: { EGRID: 'CH1' } } },
      })
      vi.stubGlobal('$fetch', fetchMock)

      const result = await useOereb().getExtractById({ EGRID: 'CH1', language: 'de' })

      expect(fetchMock).toHaveBeenCalledWith('https://oereb.example/extract/json?EGRID=CH1&LANG=de')
      expect(result).toEqual({ extract: { RealEstate: { EGRID: 'CH1' } } })
    })

    it('passes through responses that already contain the extract', async () => {
      const data = { extract: { RealEstate: { EGRID: 'CH1' } } }
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(data))

      expect(await useOereb().getExtractById({ EGRID: 'CH1', language: 'de' })).toEqual(data)
    })

    it('treats empty responses as 204', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))

      const error = await useOereb()
        .getExtractById({ EGRID: 'CH951946873506', language: 'de' })
        .catch((e: Error & { response?: { status: number }, isTempParcel?: boolean }) => e)

      expect(error.message).toBe('Empty response')
      expect(error.response?.status).toBe(204)
      expect(error.isTempParcel).toBe(false)
    })

    it('flags temporary parcel numbers on empty responses', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))

      const error = await useOereb()
        .getExtractById({ EGRID: 'BE0012TEMP123-1-0', language: 'de' })
        .catch((e: Error & { isTempParcel?: boolean }) => e)

      expect(error.isTempParcel).toBe(true)
    })

    it('decorates http 204 fetch errors with the temp parcel flag', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
        Object.assign(new Error('no content'), { response: { status: 204 } }),
      ))

      const error = await useOereb()
        .getExtractById({ EGRID: 'BE0012TEMP123-1-0', language: 'de' })
        .catch((e: Error & { response?: { status: number }, isTempParcel?: boolean }) => e)

      expect(error.message).toBe('204 No Content')
      expect(error.response?.status).toBe(204)
      expect(error.isTempParcel).toBe(true)
    })

    it('marks unexpected response structures as invalid data', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ unrelated: true }))

      const error = await useOereb()
        .getExtractById({ EGRID: 'CH1', language: 'de' })
        .catch((e: Error & { invalidData?: boolean }) => e)

      expect(error.message).toBe('Unexpected response structure')
      expect(error.invalidData).toBe(true)
    })

    it('marks other fetch errors as invalid data', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('boom')))

      const error = await useOereb()
        .getExtractById({ EGRID: 'CH1', language: 'de' })
        .catch((e: Error & { invalidData?: boolean }) => e)

      expect(error.message).toBe('boom')
      expect(error.invalidData).toBe(true)
    })
  })
})

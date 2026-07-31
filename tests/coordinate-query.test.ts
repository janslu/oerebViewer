import { describe, it, expect } from 'vitest'
import { parseCoordinateQuery } from '~/helpers/coordinates'

// reference point checked against the bern metawarehouse coordinate search:
// LV95 2600983, 1197426 <-> lon 7.4515400705155, lat 46.9279285332692
const REF = { x: 2600983, y: 1197426, lon: 7.4515400705155, lat: 46.9279285332692 }

describe('parseCoordinateQuery', () => {
  describe('wgs84', () => {
    it('parses lat,lon pairs', () => {
      const result = parseCoordinateQuery('46.94304142827599, 7.440462684216267')

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBe(46.94304142827599)
      expect(result?.lon).toBe(7.440462684216267)
      expect(result?.x).toBeGreaterThan(2450000)
      expect(result?.x).toBeLessThan(2850000)
      expect(result?.y).toBeGreaterThan(1050000)
      expect(result?.y).toBeLessThan(1350000)
    })

    it('accepts lon lat order and space separators', () => {
      const result = parseCoordinateQuery('7.440462684216267 46.94304142827599')

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBe(46.94304142827599)
      expect(result?.lon).toBe(7.440462684216267)
    })
  })

  describe('lv95', () => {
    it('parses x,y pairs and resolves lon/lat', () => {
      const result = parseCoordinateQuery('2600983,1197426')

      expect(result?.type).toBe('lv95')
      expect(result?.x).toBe(REF.x)
      expect(result?.y).toBe(REF.y)
      expect(Math.abs(result!.lon - REF.lon)).toBeLessThan(1e-4)
      expect(Math.abs(result!.lat - REF.lat)).toBeLessThan(1e-4)
    })

    it('accepts y x order', () => {
      const result = parseCoordinateQuery('1197426 2600983')

      expect(result?.type).toBe('lv95')
      expect(result?.x).toBe(REF.x)
      expect(result?.y).toBe(REF.y)
    })

    it('accepts apostrophes as thousands separators', () => {
      const result = parseCoordinateQuery('2\'600\'983, 1\'197\'426')

      expect(result?.type).toBe('lv95')
      expect(result?.x).toBe(REF.x)
      expect(result?.y).toBe(REF.y)
    })
  })

  describe('lv03', () => {
    it('parses x,y pairs and resolves them near the equivalent lv95 point', () => {
      const result = parseCoordinateQuery('600983 197426')

      expect(result?.type).toBe('lv03')
      // lv03 -> lv95 differs from the naive +2000000/+1000000 shift by < ~2m
      expect(Math.abs(result!.x - REF.x)).toBeLessThan(5)
      expect(Math.abs(result!.y - REF.y)).toBeLessThan(5)
      expect(Math.abs(result!.lon - REF.lon)).toBeLessThan(1e-3)
      expect(Math.abs(result!.lat - REF.lat)).toBeLessThan(1e-3)
    })
  })

  describe('rejections', () => {
    it.each([
      ['plain text', 'Chur'],
      ['address', 'Masanserstrasse 3'],
      ['single number', '46.94'],
      ['three numbers', '46.94 7.44 12'],
      ['numbers out of any swiss range', '12 34'],
      ['two latitudes without longitude', '46.94, 46.94'],
      ['lv95 x with wgs84 lat', '2600983, 46.94'],
      ['empty string', ''],
      ['whitespace only', '   '],
    ])('rejects %s', (_name, query) => {
      expect(parseCoordinateQuery(query)).toBeNull()
    })
  })
})

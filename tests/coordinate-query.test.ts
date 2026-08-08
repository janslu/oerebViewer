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

  describe('dms notation', () => {
    // 46°56'48.74" 7°27'48.46" is the bern zytglogge area
    const LAT = 46 + 56 / 60 + 48.74 / 3600
    const LON = 7 + 27 / 60 + 48.46 / 3600

    it('parses plain dms pairs', () => {
      const result = parseCoordinateQuery('46°56\'48.74" 7°27\'48.46"')

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBeCloseTo(LAT, 8)
      expect(result?.lon).toBeCloseTo(LON, 8)
    })

    it('parses dms pairs with hemisphere letters', () => {
      const result = parseCoordinateQuery('46°56\'48.74"N 7°27\'48.46"E')

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBeCloseTo(LAT, 8)
      expect(result?.lon).toBeCloseTo(LON, 8)
    })

    it('respects hemisphere letters over input order', () => {
      const result = parseCoordinateQuery('7°27\'48.46"E 46°56\'48.74"N')

      expect(result?.lat).toBeCloseTo(LAT, 8)
      expect(result?.lon).toBeCloseTo(LON, 8)
    })

    it('accepts the german east letter and comma decimals', () => {
      const result = parseCoordinateQuery('46°56\'48,74"N 7°27\'48,46"O')

      expect(result?.lat).toBeCloseTo(LAT, 8)
      expect(result?.lon).toBeCloseTo(LON, 8)
    })

    it('accepts unicode degree minute second marks', () => {
      const result = parseCoordinateQuery('46°56′48.74″ 7°27′48.46″')

      expect(result?.lat).toBeCloseTo(LAT, 8)
    })

    it('accepts degrees with decimal minutes only', () => {
      const result = parseCoordinateQuery("46°56.8123' 7°27.8077'")

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBeCloseTo(46 + 56.8123 / 60, 8)
    })

    it.each([
      ['minutes over 59', '46°79\'48.74" 7°27\'48.46"'],
      ['seconds over 59', '46°56\'88.74" 7°27\'48.46"'],
      ['southern hemisphere', '46°56\'48.74"S 7°27\'48.46"E'],
      ['conflicting hemisphere letters', '46°56\'48.74"N 47°27\'48.46"N'],
      ['a single dms group', '46°56\'48.74"'],
      ['degrees outside switzerland', '52°31\'12.0" 13°24\'36.0"'],
    ])('rejects %s', (_name, query) => {
      expect(parseCoordinateQuery(query)).toBeNull()
    })
  })

  describe('locale tolerant input', () => {
    it('ignores a trailing separator', () => {
      const result = parseCoordinateQuery('9.693888889 46.9066667,')

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBe(46.9066667)
      expect(result?.lon).toBe(9.693888889)
    })

    it('accepts comma decimals from german locale tools', () => {
      const result = parseCoordinateQuery('46,9066667 9,693888889')

      expect(result?.type).toBe('wgs84')
      expect(result?.lat).toBe(46.9066667)
      expect(result?.lon).toBe(9.693888889)
    })

    it('accepts comma decimals on lv95 pairs', () => {
      const result = parseCoordinateQuery('2600983,5 1197426')

      expect(result?.type).toBe('lv95')
      expect(result?.x).toBe(2600983.5)
      expect(result?.y).toBe(1197426)
    })

    it('still rejects ambiguous multi comma input', () => {
      expect(parseCoordinateQuery('46,94, 7,44')).toBeNull()
      expect(parseCoordinateQuery('Chur, GR')).toBeNull()
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

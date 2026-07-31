import { describe, it, expect } from 'vitest'
import { transform } from 'ol/proj'
import { convertToSwissCoordinates } from '~/helpers/coordinates'

describe('convertToSwissCoordinates', () => {
  it('converts WGS84 to LV95 within swiss bounds', () => {
    // Bern, Kramgasse area
    const [x, y] = convertToSwissCoordinates(7.440462684216267, 46.94304142827599)

    expect(x).toBeGreaterThan(2450000)
    expect(x).toBeLessThan(2850000)
    expect(y).toBeGreaterThan(1050000)
    expect(y).toBeLessThan(1350000)
  })

  it('maps the LV95 fundamental point (old Bern observatory) correctly', () => {
    // E 2600000 / N 1200000 is defined at lon 7.438632, lat 46.951083
    const [x, y] = convertToSwissCoordinates(7.438632495, 46.951082877)

    expect(Math.abs(x - 2600000)).toBeLessThan(200)
    expect(Math.abs(y - 1200000)).toBeLessThan(200)
  })

  it('round-trips WGS84 -> LV95 -> WGS84', () => {
    const lon = 9.532
    const lat = 46.8508
    const [x, y] = convertToSwissCoordinates(lon, lat)
    const [lonBack, latBack] = transform([x, y], 'EPSG:2056', 'EPSG:4326')

    expect(Math.abs(lonBack - lon)).toBeLessThan(1e-6)
    expect(Math.abs(latBack - lat)).toBeLessThan(1e-6)
  })
})

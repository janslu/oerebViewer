import { describe, it, expect } from 'vitest'
import { isWithinBoundary } from '~/helpers/coordinates'
import bernBoundary from '~/config/bern/boundary.json'
import graubuendenBoundary from '~/config/graubuenden/boundary.json'

describe('isWithinBoundary', () => {
  // 10 x 10 km square: x 2600000-2610000, y 1190000-1200000
  const square = {
    coordinates: [[[
      [2600000, 1190000],
      [2610000, 1190000],
      [2610000, 1200000],
      [2600000, 1200000],
    ]]],
  }

  it('accepts points inside the polygon', () => {
    expect(isWithinBoundary(2605000, 1195000, square)).toBe(true)
  })

  it('accepts points within the grace distance of the border', () => {
    expect(isWithinBoundary(2610900, 1195000, square)).toBe(true)
  })

  it('rejects points beyond the grace distance', () => {
    expect(isWithinBoundary(2611100, 1195000, square)).toBe(false)
    expect(isWithinBoundary(2650000, 1195000, square)).toBe(false)
  })
})

describe('generated canton boundaries', () => {
  const bern = { x: 2600983, y: 1197426 } // bern city
  const hut = { x: 2771728, y: 1197579 } // mountain hut in graubuenden
  const zurich = { x: 2683000, y: 1247000 }

  it('carry their source and structure', () => {
    for (const boundary of [bernBoundary, graubuendenBoundary]) {
      expect(boundary.source).toContain('swissBOUNDARIES3D')
      expect(boundary.coordinates.length).toBeGreaterThan(0)

      const largestRing = Math.max(...boundary.coordinates.map(p => p[0].length))
      expect(largestRing).toBeGreaterThan(200)
    }
  })

  it('bern boundary contains bern city but not the graubuenden hut', () => {
    expect(isWithinBoundary(bern.x, bern.y, bernBoundary)).toBe(true)
    expect(isWithinBoundary(hut.x, hut.y, bernBoundary)).toBe(false)
    expect(isWithinBoundary(zurich.x, zurich.y, bernBoundary)).toBe(false)
  })

  it('graubuenden boundary contains the hut but not bern city', () => {
    expect(isWithinBoundary(hut.x, hut.y, graubuendenBoundary)).toBe(true)
    expect(isWithinBoundary(bern.x, bern.y, graubuendenBoundary)).toBe(false)
    expect(isWithinBoundary(zurich.x, zurich.y, graubuendenBoundary)).toBe(false)
  })
})

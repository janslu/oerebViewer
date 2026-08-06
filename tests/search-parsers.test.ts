import { describe, it, expect } from 'vitest'
import { searchService as bernSearchService } from '~/config/bern/setup.js'
import { searchService as graubuendenSearchService } from '~/config/graubuenden/setup.js'

describe('bern search parser', () => {
  it('parses the metawarehouse response shape', () => {
    const response = [
      {
        weight: 1,
        origin: 'coordinate',
        label: '2600983,1197426 (Landeskoordinate)',
        lon: 7.4515400705155,
        lat: 46.9279285332692,
        x: 2600983,
        y: 1197426,
        bbox: 'BOX(2600983 1197426,2600983 1197426)',
      },
    ]

    const results = bernSearchService.parser(response)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: '2600983-1197426',
      label: '2600983,1197426 (Landeskoordinate)',
      lat: 46.9279285332692,
      lon: 7.4515400705155,
      x: 2600983,
      y: 1197426,
    })
  })
})

describe('graubuenden search parser', () => {
  it('parses the swisstopo SearchServer response shape', () => {
    const response = {
      results: [
        {
          id: 3901,
          attrs: {
            label: '<b>Chur (GR)</b>',
            geom_st_box2d: 'BOX(753602 180907,768116 196888)',
            lat: 46.83235549926758,
            lon: 9.516542434692383,
            x: 759000,
            y: 189000,
          },
        },
      ],
    }

    const results = graubuendenSearchService.parser(response)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: 3901,
      label: '<b>Chur (GR)</b>',
      lat: 46.83235549926758,
      lon: 9.516542434692383,
      x: 759000,
      y: 189000,
      bbox: 'BOX(753602 180907,768116 196888)',
    })
  })

  it('marks results as html formatted', () => {
    expect(graubuendenSearchService.isHtmlFormatted).toBe(true)
  })

  it('drops entries with the same visible label', () => {
    const attrs = { lat: 46.8, lon: 9.5, x: 1, y: 2 }
    const response = {
      results: [
        { id: 1, attrs: { ...attrs, label: '<b>Chur (GR)</b>' } },
        { id: 2, attrs: { ...attrs, label: '<b>Chur (GR)</b>' } },
        { id: 3, attrs: { ...attrs, label: '<b>Chur\n</b> (GR)' } },
        // same visible label a few meters apart, e.g. both motorway carriageways
        { id: 4, attrs: { ...attrs, label: '<b>Chur (GR)</b>', x: 9 } },
        { id: 5, attrs: { ...attrs, label: '<b>Churwalden (GR)</b>' } },
      ],
    }

    const results = graubuendenSearchService.parser(response)

    expect(results.map((r: { id: number }) => r.id)).toEqual([1, 5])
  })

  it('filters public transport stops out via the search url', () => {
    expect(graubuendenSearchService.search).toContain('origins=')
    expect(graubuendenSearchService.search).not.toContain('haltestellen')
  })
})

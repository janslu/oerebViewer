import { describe, it, expect, vi } from 'vitest'

vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { configContext: 'defaults' } }),
}))

const { mergeConfigs } = await import('~/config/setup')

describe('mergeConfigs', () => {
  it('returns defaults when no custom config is given', () => {
    const defaults = { view: { zoom: 8 }, locales: ['de'] }

    expect(mergeConfigs(defaults)).toEqual(defaults)
  })

  it('overrides primitives with custom values', () => {
    const merged = mergeConfigs({ usesEsriToken: false }, { usesEsriToken: true })

    expect(merged.usesEsriToken).toBe(true)
  })

  it('uses custom objects only when they have properties', () => {
    const defaults = { oerebService: { getExtractByEGRID: 'https://default' } }

    expect(mergeConfigs(defaults, { oerebService: {} }).oerebService).toEqual(
      defaults.oerebService,
    )
    expect(
      mergeConfigs(defaults, { oerebService: { getExtractByEGRID: 'https://custom' } })
        .oerebService,
    ).toEqual({ getExtractByEGRID: 'https://custom' })
  })

  it('uses custom arrays only when they are not empty', () => {
    const defaults = { backgroundLayers: [{ type: 'WMTS' }] }

    expect(mergeConfigs(defaults, { backgroundLayers: [] }).backgroundLayers).toEqual(
      defaults.backgroundLayers,
    )
    expect(
      mergeConfigs(defaults, { backgroundLayers: [{ type: 'WMS' }] }).backgroundLayers,
    ).toEqual([{ type: 'WMS' }])
  })

  it('keeps default keys that the custom config does not define', () => {
    const merged = mergeConfigs(
      { view: { zoom: 8 }, zoom: { oerebLayer: 16.5 } },
      { view: { zoom: 10 } },
    )

    expect(merged.view).toEqual({ zoom: 10 })
    expect(merged.zoom).toEqual({ oerebLayer: 16.5 })
  })
})

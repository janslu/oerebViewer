import { describe, it, expect } from 'vitest'
import { extractToTemplateVars } from '~/helpers/transformers'

const extract = {
  RealEstate: {
    EGRID: 'CH951946873506',
    Number: '2711',
    MunicipalityName: 'Bern',
    MunicipalityCode: '351',
    SubunitOfLandRegister: 'Bern',
  },
  CreationDate: '2026-07-31',
  MunicipalityLogoRef: 'https://logo.example/bern.png',
}

describe('extractToTemplateVars', () => {
  it('maps extract fields to template variables', () => {
    const vars = extractToTemplateVars(extract)

    expect(vars.EGRID).toBe('CH951946873506')
    expect(vars.number).toBe('2711')
    expect(vars.municipality).toBe('Bern')
    expect(vars.municipalityCode).toBe('351')
    expect(vars.creationDate).toBe('2026-07-31')
    expect(vars.municipalityLogo).toBe('https://logo.example/bern.png')
    expect(vars.subunitOfLandRegister).toBe('Bern')
  })

  it('adds uppercase variants for every variable', () => {
    const vars = extractToTemplateVars(extract, { language: 'de' })

    expect(vars.EGRIDUppercase).toBe('CH951946873506')
    expect(vars.municipalityUppercase).toBe('BERN')
    expect(vars.languageUppercase).toBe('DE')
  })

  it('falls back to defaults when the extract is missing fields', () => {
    const vars = extractToTemplateVars(undefined, { municipality: 'CH123' })

    expect(vars.municipality).toBe('CH123')
    expect(vars.EGRID).toBeUndefined()
  })

  it('keeps additional default variables', () => {
    const vars = extractToTemplateVars(extract, { url: '/d/CH951946873506' })

    expect(vars.url).toBe('/d/CH951946873506')
  })
})

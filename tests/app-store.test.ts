import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('~/config/setup', () => ({
  getLocales: async () => [
    { code: 'de', language: 'de-CH', file: 'de.js', title: 'Deutsch' },
    { code: 'fr', language: 'fr-CH', file: 'fr.js', title: 'Français' },
  ],
}))

const { useAppStore } = await import('~/store/app')

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads the configured locales', async () => {
    const store = useAppStore()
    await store.initializeStore()

    expect(store.locales.map((l: { code: string }) => l.code)).toEqual(['de', 'fr'])
  })

  it('toggles and sets the menu state', () => {
    const store = useAppStore()

    expect(store.isMenuOpen).toBe(false)
    store.toggleMenuOpen()
    expect(store.isMenuOpen).toBe(true)
    store.setMenuOpen(false)
    expect(store.isMenuOpen).toBe(false)
  })
})

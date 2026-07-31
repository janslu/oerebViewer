import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~': root,
      '@': root,
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: [
        'store/**',
        'helpers/**',
        'composables/**',
        'services/**',
        'config/setup.ts',
      ],
    },
  },
})

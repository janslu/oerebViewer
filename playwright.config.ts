import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end smoke tests against the generated static build.
 * Run `npm run generate` first, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4317',
    locale: 'de-CH',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx serve dist -l 4317',
    url: 'http://localhost:4317',
    reuseExistingServer: !process.env.CI,
  },
})

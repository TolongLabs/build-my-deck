import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pw.ts',
  use: { headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
})

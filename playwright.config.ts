import { defineConfig } from '@playwright/test'

// page.setContent() with no prior navigation leaves the page on an opaque
// ("about:blank") origin, where Storage APIs (localStorage, OPFS, etc.) throw
// SecurityError. Every *.pw.ts test needs a real origin to page.goto() into
// first. Centralized here (task 5 QA wave-2 fix, W-4) so every test author
// gets one by default instead of hand-rolling a node:http server per file.
const PW_ORIGIN_PORT = 4173

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pw.ts',
  use: { headless: true, baseURL: `http://127.0.0.1:${PW_ORIGIN_PORT}` },
  webServer: {
    command: `bun -e "Bun.serve({ port: ${PW_ORIGIN_PORT}, fetch: () => new Response('<!doctype html><html><body></body></html>', { headers: { 'content-type': 'text/html' } }) })"`,
    port: PW_ORIGIN_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
})

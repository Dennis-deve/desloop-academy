import { defineConfig, devices } from '@playwright/test';

// Browser checks for the physically separate public static artifact and exact-route server.
// This is local evidence; Render's real CDN/redirects need their own hosted smoke.
export default defineConfig({
  testDir: './e2e-render',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run build:render-public && node scripts/serve_render_public.mjs',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

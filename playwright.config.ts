import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // The opt-in database test resets its isolated pilot schema, so run projects serially.
  workers:
    process.env.PILOT_E2E_DATABASE_URL || process.env.ENGINE_E2E_DATABASE_URL ? 1 : undefined,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    // Default browser tests call the REAL disabled Fastify status endpoint; an opt-in
    // PostgreSQL E2E run already supplies its own enabled API and isolated database.
    ...(!process.env.PILOT_E2E_DATABASE_URL && !process.env.ENGINE_E2E_DATABASE_URL
      ? [{
          command: 'npm run dev:api',
          url: 'http://127.0.0.1:4000/api/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: { PILOT_ENABLED: 'false', ENGINE_V2_ENABLED: 'false' },
        }]
      : []),
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

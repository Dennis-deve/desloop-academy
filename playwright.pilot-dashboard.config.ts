import { defineConfig, devices } from '@playwright/test';

// Isolated, opt-in database browser QA. Never run against a shared or hosted DB.
const databaseUrl = process.env.PILOT_E2E_DATABASE_URL;
if (
  !databaseUrl ||
  new URL(databaseUrl).hostname !== '127.0.0.1' ||
  !new URL(databaseUrl).pathname.startsWith('/desloop_pilot_disposable_')
)
  throw new Error('Private dashboard browser tests require a fresh named 127.0.0.1 disposable DB');
const origin = 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'pilot.spec.ts',
  workers: 1,
  timeout: 120_000,
  use: { baseURL: origin, trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        APP_ORIGIN: origin,
        DATABASE_URL: databaseUrl,
        PILOT_ENABLED: 'true',
        PILOT_DRAFT_ACKNOWLEDGED: 'true',
        PILOT_LOCAL_E2E_AUTH_LIMIT: 'true',
        ENGINE_V2_ENABLED: 'false',
        AI_GATEWAY_ENABLED: 'false',
      },
    },
    {
      command: './node_modules/.bin/vite --host 127.0.0.1',
      url: origin,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

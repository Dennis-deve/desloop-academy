import { defineConfig, devices } from '@playwright/test';

// Opt-in only: unlike ordinary public browser tests, this launches a real adult
// API and uses a separately migrated disposable PostgreSQL database on loopback.
const databaseUrl = process.env.PROJECT_CORE_E2E_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).hostname !== '127.0.0.1' ||
    !new URL(databaseUrl).pathname.startsWith('/desloop_project_core_disposable_'))
  throw new Error('Project-client browser tests require a named disposable 127.0.0.1 PostgreSQL DB');
const origin = 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './e2e-project-core',
  workers: 1,
  timeout: 90_000,
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
        PROJECT_CORE_ENABLED: 'true',
        PROJECT_CORE_LOCAL_ACKNOWLEDGED: 'true',
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

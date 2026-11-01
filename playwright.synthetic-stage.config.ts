import { defineConfig, devices } from '@playwright/test';

// Opt-in: tests the built Fastify SPA/API over one origin, behind the actual
// synthetic Basic gate. Never point browser QA at a shared or remote database.
const databaseUrl = process.env.SYNTHETIC_STAGE_E2E_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).hostname !== '127.0.0.1' ||
    new URL(databaseUrl).pathname !== '/desloop_project_core_disposable_stage_browser')
  throw new Error('Synthetic-stage browser QA requires its own exact disposable loopback PostgreSQL database');
const origin = 'http://127.0.0.1:4012';
const gateKey = 'a'.repeat(64); // Synthetic test fixture only, never a deployed secret.
const runtimeUrl = new URL(databaseUrl);
runtimeUrl.username = 'desloop_stage_runtime';
runtimeUrl.password = 'stage-browser-only-password';

export default defineConfig({
  testDir: './e2e-synthetic-stage',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: origin,
    httpCredentials: { username: 'desloop-review', password: gateKey },
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node --import tsx scripts/prepare_synthetic_stage_e2e.ts && npm start',
    url: `${origin}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '4012', APP_ORIGIN: origin,
      STATIC_DIR: 'dist', DATABASE_URL: runtimeUrl.href,
      PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
      PILOT_LOCAL_E2E_AUTH_LIMIT: 'true',
      ENGINE_V2_ENABLED: 'true', ENGINE_DRAFT_ACKNOWLEDGED: 'true',
      PROJECT_CORE_ENABLED: 'true', PROJECT_CORE_LOCAL_ACKNOWLEDGED: 'true',
      AI_GATEWAY_ENABLED: 'false',
      SYNTHETIC_STAGE_GATE_ENABLED: 'true', SYNTHETIC_STAGE_GATE_HEX_KEY: gateKey,
    },
  },
});

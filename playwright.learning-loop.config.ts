import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-learning-loop',
  timeout: 40_000,
  workers: 1,
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});

import { defineConfig, devices } from '@playwright/test';

// Only after an owner has created the public Render static site. This suite
// targets its actual onrender.com origin; it never starts or proxies a local API.
const raw = process.env.RENDER_PUBLIC_SITE_URL;
let origin: string;
try {
  const url = new URL(raw ?? '');
  if (
    url.protocol !== 'https:' ||
    !/^[a-z0-9-]+\.onrender\.com$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('not an exact Render origin');
  origin = url.origin;
} catch {
  throw new Error('RENDER_PUBLIC_SITE_URL must be the reviewed exact HTTPS onrender.com origin');
}

export default defineConfig({
  testDir: './e2e-render',
  workers: 1,
  use: { baseURL: origin, trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});

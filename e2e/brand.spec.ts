import { expect, test, type Locator } from '@playwright/test';

const assets = [
  '/brand/wordmark-dark.webp',
  '/brand/wordmark-light.webp',
  '/brand/wordmark-mono.webp',
  '/brand/brandmark-dark.webp',
  '/brand/app-icon.webp',
  '/favicon.png',
  '/apple-touch-icon.png',
] as const;

async function expectImageLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
}

test('the supplied Desloop identity loads on the real read-only release', async ({ page, request }) => {
  for (const asset of assets) {
    const response = await request.get(asset);
    expect(response.status(), `${asset} must be available`).toBe(200);
    expect(response.headers()['content-type']).toContain(asset.endsWith('.webp') ? 'image/webp' : 'image/png');
  }
  await page.goto('/');
  const home = page.getByRole('link', { name: 'Desloop Academy home' }).first();
  await expectImageLoaded(home.locator('img[src="/brand/brandmark-dark.webp"]'));
  const footer = page.locator('footer img[src="/brand/wordmark-mono.webp"]');
  await footer.scrollIntoViewIfNeeded();
  await expectImageLoaded(footer);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.png');
});

test('branding and navigation reflow at 320 CSS pixels without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]);
});

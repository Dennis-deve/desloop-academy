import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
}

test('supplied Desloop identity loads across the public site and demo', async ({
  page,
  request,
}) => {
  for (const asset of assets) {
    const response = await request.get(asset);
    expect(response.status(), `${asset} should be included in the preview`).toBe(200);
    expect(response.headers()['content-type']).toContain(
      asset.endsWith('.webp') ? 'image/webp' : 'image/png',
    );
  }

  await page.goto('/');
  await expectImageLoaded(page.getByRole('img', { name: /multicolour wordmark/i }));
  await expectImageLoaded(page.locator('header img[src="/brand/brandmark-dark.webp"]'));
  const footerWordmark = page.locator('footer img[src="/brand/wordmark-mono.webp"]');
  await footerWordmark.scrollIntoViewIfNeeded();
  await expectImageLoaded(footerWordmark);

  await page.goto('/about');
  await expectImageLoaded(page.getByRole('img', { name: /wordmark on a light background/i }));

  await page.goto('/demo');
  await expectImageLoaded(page.locator('img[src="/brand/app-icon.webp"]'));
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.png');
});

test('branded landing page has no detectable A/AA violations in dark mode', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('desloop-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect
    .poll(() =>
      page
        .locator('.public-nav-link')
        .first()
        .evaluate((node) => getComputedStyle(node).color),
    )
    .toBe('rgb(245, 247, 252)');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations,
    results.violations
      .map((issue) => `${issue.id}: ${issue.nodes.map((node) => node.target).join(', ')}`)
      .join('\n'),
  ).toEqual([]);
});

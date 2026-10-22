import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const [name, route] of [
  ['landing page', '/'],
  ['read-only catalogue', '/courses'],
  ['draft course outline', '/courses/getting-started-with-learning-and-digital-confidence'],
  ['learning method', '/how-it-works'],
  ['availability and recovery', '/availability'],
] as const) {
  test(`${name} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
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
}

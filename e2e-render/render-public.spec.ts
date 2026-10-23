import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the isolated course site has real branded routes, readable drafts and no private requests', async ({
  page,
}) => {
  const privateRequests: string[] = [];
  page.on('request', (request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') ||
      new URL(request.url()).pathname.startsWith('/pilot')
    )
      privateRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn it.');
  await page.getByRole('link', { name: /Explore the 44-course outline/i }).click();
  await expect(page.getByRole('status')).toContainText('Showing 44 of 44 courses');
  await page
    .getByRole('searchbox', { name: 'Search course outlines' })
    .fill('not-in-the-course-guide');
  await expect(page.getByText('No matching course outlines')).toBeVisible();
  await page.getByRole('button', { name: 'Show all courses' }).click();
  await expect(page.getByRole('status')).toContainText('Showing 44 of 44 courses');
  await page.goto('/courses/getting-started-with-learning-and-digital-confidence');
  await expect(page.getByText(/cannot enrol anyone or save progress/i)).toBeVisible();
  await page.goto('/availability');
  await expect(page.getByText(/current availability is unknown here/i)).toBeVisible();
  expect(privateRequests).toEqual([]);
});

test('server denies private/unknown paths; browser has no active adult or AI controls', async ({
  page,
  request,
}) => {
  for (const path of [
    '/pilot',
    '/pilot/ai/admin',
    '/api/pilot/status',
    '/register',
    '/checkout',
    '/courses/not-real',
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  await page.goto('/');
  expect(await page.getByRole('link', { name: /enrol|open ai|pay/i }).count()).toBe(0);
});

test('read-only pages have no detectable WCAG A/AA axe violations', async ({ page }) => {
  for (const path of ['/', '/courses', '/availability']) {
    await page.goto(path);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(report.violations, path).toEqual([]);
  }
});

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
  expect(await page.evaluate(() => scrollY)).toBe(0); // Initial focus must not crop the read-only notice.
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

test('the public motion controls change only presentation, not private data or course access', async ({ page }) => {
  const privateRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) privateRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('.motion-particles')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'static');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'running');
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    expect(await page.locator('.motion-orbit-rotor').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  }
  const orbit = page.getByRole('group', { name: 'Four selectable learning stages' });
  await orbit.getByRole('button', { name: 'Pause orbit' }).click();
  await expect(orbit.getByRole('button', { name: 'Resume orbit' })).toHaveAttribute('aria-pressed', 'true');
  await orbit.getByRole('button', { name: /02\. Build/ }).click();
  await expect(orbit.getByRole('button', { name: /02\. Build/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.motion-orbit-center strong')).toHaveText('Build');
  const ticker = page.getByRole('group', { name: 'Unreviewed draft course stages' });
  await ticker.getByRole('button', { name: 'Pause stage ticker' }).click();
  await expect(ticker.getByRole('button', { name: 'Resume stage ticker' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'static');
  await page.locator('h1').scrollIntoViewIfNeeded();
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'running');
  await expect(page.getByText(/information, not enrolment/)).toBeVisible();
  expect(privateRequests).toEqual([]);
});

test('reduced motion stops particles and CSS animation but keeps stage selection and all labels readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'static');
  expect(await page.locator('.motion-orbit-rotor').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.motion-ticker-track').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.getByRole('button', { name: 'Pause orbit' })).toBeHidden();
  await page.getByRole('button', { name: /03\. Share/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.motion-orbit-center strong')).toHaveText('Share');
  await expect(page.locator('.motion-ticker-list').first().getByText(/Stage 09/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
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

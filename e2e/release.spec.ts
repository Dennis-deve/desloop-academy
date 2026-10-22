import { test, expect } from '@playwright/test';

const firstCourse = '/courses/getting-started-with-learning-and-digital-confidence';

test('visitor follows a truthful ordered catalogue, filters and recovers from an empty result', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn it.');
  await page.getByRole('link', { name: /Explore the 44-course outline/i }).click();
  await expect(page.getByRole('status')).toContainText('Showing 44 of 44 courses');
  await page.getByRole('searchbox', { name: 'Search course outlines' }).fill('not-a-real-course-zzzz');
  await expect(page.getByText('No matching course outlines')).toBeVisible();
  await page.getByRole('button', { name: 'Show all courses' }).click();
  await expect(page.getByRole('status')).toContainText('Showing 44 of 44 courses');
  await page.goto(firstCourse);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Getting Started');
  await expect(page.getByText(/cannot enrol anyone or save progress/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /submit|enrol|pay now/i })).toHaveCount(0);
});

test('fake account, school and payment routes cannot be used by direct URL', async ({ page }) => {
  for (const path of ['/demo', '/app', '/register', '/school/classes', '/workspace/checkout']) {
    await page.goto(path);
    await expect(page.getByText('This page is not available')).toBeVisible();
    await expect(page.getByText(/No account, payment or progress has been created/i)).toBeVisible();
  }
});

test('mobile navigation and skip link work by keyboard without role switching', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Availability' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Availability and next steps' })).toBeVisible();
  await expect(page.locator('#release-mobile-nav')).toBeHidden();
});

test('default availability reads the actual same-origin disabled Fastify API', async ({ page }) => {
  await page.goto('/availability');
  await expect(page.getByText(/internal adult API reports inactive/i)).toBeVisible();
  await expect(page.getByText(/Public registration, child enrolment/i)).toBeVisible();
});

test('availability reflects a valid enabled status response but still states public access is closed', async ({ page }) => {
  await page.route('**/api/pilot/status', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, engineV2Enabled: true }),
  }));
  await page.goto('/availability');
  await expect(page.getByText(/internal adult API reports active/i)).toBeVisible();
  await expect(page.getByText(/does not open enrolment/i)).toBeVisible();
  await expect(page.getByText(/Public registration, child enrolment/i)).toBeVisible();
});

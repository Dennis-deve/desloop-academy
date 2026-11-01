import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const review = `file://${resolve(process.cwd(), '..', 'Desloop_Learning_Loop_Design_Review.html')}`;

async function axeClean(page: import('@playwright/test').Page) {
  const issues = (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
  ).violations;
  expect(
    issues.map((issue) => `${issue.id}: ${issue.nodes.map((node) => node.target).join(', ')}`),
  ).toEqual([]);
}

test('offline self-contained review: truthful empty state, original brand, readable footer in both themes and accessibility', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('file:') && !request.url().startsWith('data:'))
      errors.push(`Unexpected network request: ${request.url()}`);
  });
  await page.goto(review);
  await expect(page.getByRole('heading', { name: /Curiosity starts/ })).toBeVisible();
  await expect(page.getByText('No private record connected')).toBeVisible();
  await expect(page.getByText('Activity unavailable')).toBeVisible();
  await expect(page.locator('.ll-identity img')).toHaveJSProperty('complete', true);
  await expect(page.locator('.ll-footer')).toHaveCSS('background-color', 'rgb(20, 20, 49)');
  await expect(page.locator('.ll-footer a').first()).toHaveCSS('color', 'rgb(242, 243, 255)');
  await axeClean(page);
  const theme = page.locator('.ll-theme-toggle');
  await theme.click();
  await expect(page.locator('.learning-loop')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.ll-footer')).toHaveCSS('background-color', 'rgb(20, 20, 49)');
  await expect(page.locator('.ll-footer a').first()).toHaveCSS('color', 'rgb(242, 243, 255)');
  await axeClean(page);
  expect(errors).toEqual([]);
});

test('four-stage orbit, actual draft filters, age lenses and accessible keyboard controls', async ({
  page,
}) => {
  await page.goto(review);
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'running');
  await page.getByRole('button', { name: 'Pause orbit' }).click();
  await expect(page.getByRole('button', { name: 'Resume orbit' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pause stage ticker' }).click();
  await expect(page.getByRole('button', { name: 'Resume stage ticker' })).toHaveAttribute('aria-pressed', 'true');
  const stages = ['Learn', 'Build', 'Share', 'Grow'];
  for (const [index, label] of stages.entries()) {
    const button = page.getByRole('button', { name: new RegExp(`0${index + 1}\\. ${label}`) });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.motion-orbit-center strong')).toHaveText(label);
  }
  await expect(page.getByText(/Showing 6 of 44/)).toBeVisible();
  await page.getByRole('button', { name: 'Ages 9–12' }).click();
  await expect(page.locator('.ll-course-adaptation').first()).toContainText(
    'Ages 9–12 · teaching note',
  );
  await page.locator('.ll-stage-filter select').selectOption('Data and AI');
  await expect(page.getByText(/Showing 5 of 5/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a course' }).fill('no-such-title-here');
  await expect(
    page.getByText('No matching draft course. Try another stage or search term.'),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a course' }).fill('');
  await page.locator('.ll-stage-filter select').selectOption('all');
  await page
    .getByRole('button', { name: /See course outline/ })
    .first()
    .click();
  await expect(page.locator('.ll-course-card').first().getByText('Draft modules')).toBeVisible();
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: /Show more courses/ }).click();
  await expect(page.locator('.ll-course-card')).toHaveCount(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});

test('pointer dragging really changes the block order, independently of keyboard controls', async ({
  page,
}) => {
  await page.goto(review);
  const palette = page.locator('.ll-palette');
  await palette.getByRole('button', { name: 'Move right' }).click();
  await palette.getByRole('button', { name: 'Say “Hello!”' }).click();
  const first = await page.locator('.ll-block').nth(0).boundingBox();
  const second = await page.locator('.ll-block').nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  await page.mouse.move(second!.x + second!.width / 2, second!.y + second!.height / 2);
  await page.mouse.down();
  await page.mouse.move(first!.x + first!.width / 2, first!.y + 3, { steps: 14 });
  await page.mouse.up();
  await expect(page.locator('.ll-block-description strong').first()).toHaveText('Say “Hello!”');
  await page.getByRole('button', { name: 'Run blocks' }).click();
  await expect(page.locator('.ll-block-active')).toHaveCount(1);
  await expect(page.locator('.ll-preview-stage svg')).toHaveAttribute('aria-label', /space 2 of 6/);
});

test('reorderable local block program animates SVG steps without creating learner progress; reduced motion works', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(review);
  await expect(page.locator('.motion-particles')).toHaveAttribute('data-motion', 'static');
  expect(await page.locator('.motion-orbit-ring').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  expect(await page.locator('.motion-ticker-track').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  const palette = page.locator('.ll-palette');
  await palette.getByRole('button', { name: 'Move right' }).click();
  await palette.getByRole('button', { name: 'Set colour' }).click();
  await palette.getByRole('button', { name: 'Repeat previous ×2' }).click();
  await page.getByRole('combobox', { name: 'Colour for block 2' }).selectOption('sun');
  await page.getByRole('button', { name: 'Move Set colour block up' }).click();
  // Repeat now directly follows Move and repeats that action two additional times.
  await expect(page.locator('.ll-block-description strong').first()).toHaveText('Set colour');
  await page.getByRole('button', { name: 'Run blocks' }).click();
  await expect(page.locator('.ll-preview-stage svg')).toHaveAttribute(
    'aria-label',
    /space 4 of 6, colour sun/,
  );
  await expect(
    page.getByText('Finished 4 actions in this tab. No course progress was saved.'),
  ).toBeVisible();
  await expect(page.getByText('No private record connected')).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await palette.getByRole('button', { name: 'Repeat previous ×2' }).click();
  await page.getByRole('button', { name: 'Run blocks' }).click();
  await expect(page.getByRole('alert')).toContainText('Put Repeat after');
  await expect(page.locator('.ll-preview-stage svg')).toHaveAttribute('aria-label', /space 1 of 6/);
  await axeClean(page);
});

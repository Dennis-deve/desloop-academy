import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { createDatabase, migrate } from '../server/src/db';
import { loadCatalog } from '../server/src/catalog';
import { loadConfig } from '../server/src/config';
import { hexHash } from '../server/src/security';
import type { BrowserContext, Page } from '@playwright/test';
import type { Database } from '../server/src/db';

// Run with an isolated disposable DB, migrated before the browser test, and an API
// whose APP_ORIGIN exactly matches Playwright's base URL. Normal demo E2E skips this.
const url = process.env.PILOT_E2E_DATABASE_URL;
test.skip(!url, 'Needs isolated PostgreSQL and a running pilot API at /api.');
const catalog = loadCatalog();
let db: Database;
const password = 'unique-test-passphrase-not-used-elsewhere';

async function invite(email: string, role: 'learner' | 'reviewer') {
  const invitation = randomUUID() + randomUUID();
  await db.query(
    "INSERT INTO pilot.invitations (email,role,token_hash,expires_at,created_by) VALUES ($1,$2,$3,now()+interval '1 day','e2e')",
    [email, role, hexHash(invitation)],
  );
  return invitation;
}
async function register(page: Page, name: string, invitation: string) {
  await page.goto('/pilot');
  await expect(page.getByRole('heading', { name: 'Adult learning pilot' })).toBeVisible();
  await page.getByRole('tab', { name: 'Use invitation' }).click();
  await page.getByLabel('One-time invitation code').fill(invitation);
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('checkbox', { name: /I confirm I am an adult internal tester/ }).check();
  await page.getByRole('button', { name: 'Use invitation' }).click();
  await expect(page.getByText(`${name} ·`, { exact: false })).toBeVisible();
}
async function expectAxeClean(page: Page) {
  const issues = (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
  ).violations;
  expect(
    issues,
    issues
      .map((issue) => `${issue.id}: ${issue.nodes.map((node) => node.target).join(', ')}`)
      .join('\n'),
  ).toEqual([]);
}
test.beforeAll(async () => {
  if (!url) return;
  const config = loadConfig({
    NODE_ENV: 'test',
    PILOT_ENABLED: 'true',
    PILOT_DRAFT_ACKNOWLEDGED: 'true',
    DATABASE_URL: url,
    APP_ORIGIN: 'http://127.0.0.1:5173',
  });
  db = createDatabase(config);
  await migrate(db, catalog);
  await db.query(
    'TRUNCATE pilot.users, pilot.invitations, pilot.audit_events RESTART IDENTITY CASCADE',
  );
});
test.afterAll(async () => {
  await db?.end();
});

test('browser: private invite, first course, assigned human approval and next-course gate', async ({
  page,
  browser,
}) => {
  // A retired browser-only workspace cannot sign into, or impersonate, an adult pilot user.
  await page.goto('/app');
  await expect(page.getByText('This page is not available')).toBeVisible();
  await page.goto('/pilot');
  await expect(page.getByRole('heading', { name: 'Adult learning pilot' })).toBeVisible();
  await expectAxeClean(page);
  const learnerEmail = `casey-${randomUUID().slice(0, 7)}@example.invalid`;
  await register(page, 'Casey Pilot', await invite(learnerEmail, 'learner'));
  await expect(page.getByRole('heading', { name: /Curiosity starts/ })).toBeVisible();
  await expect(page.getByText('0 of 44 draft courses passed')).toBeVisible();
  await expect(page.getByText('0 recorded actions in these 7 UTC days.')).toBeVisible();
  await expect(page.getByText('Locked by server').first()).toBeVisible();
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    // An orbiting touch target never settles for a tap; animate only its decorative ring.
    expect(await page.locator('.motion-orbit-rotor').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  }
  const initialViewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  if (initialViewport) await page.setViewportSize(initialViewport);
  await expectAxeClean(page);
  await page.getByRole('button', { name: /02. Build/ }).click();
  await expect(page.locator('.motion-orbit-center strong')).toHaveText('Build');
  await page.locator('.ll-palette').getByRole('button', { name: 'Move right' }).click();
  await page.locator('.ll-palette').getByRole('button', { name: 'Say “Hello!”' }).click();
  await page.getByRole('button', { name: 'Run blocks' }).click();
  await expect(page.locator('.ll-preview-stage svg')).toHaveAttribute('aria-label', /space 2 of 6.*saying Hello/);
  await expect(page.getByText('0 recorded actions in these 7 UTC days.')).toBeVisible(); // Lab is not course credit.
  await page.getByRole('button', { name: 'Ages 9–12' }).click();
  await expect(page.getByRole('button', { name: 'Ages 9–12' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Switch dashboard to dark theme' }).click();
  await expect(page.locator('.ll-footer')).toHaveCSS('background-color', 'rgb(20, 20, 49)');
  await expectAxeClean(page);
  await page.goto('/pilot/courses/course-02');
  await expect(page.getByRole('heading', { name: 'Course unavailable' })).toBeVisible();
  await page.goto('/pilot/courses/course-01');
  const course = catalog.courses[0];
  const lessons = course.modules.flatMap((module) => module.lessons);
  for (const lesson of lessons) {
    await expect(page.getByRole('heading', { name: lesson.title })).toBeVisible();
    await page
      .getByLabel('Describe your own practice with a fictional example')
      .fill('I practised with a fictional name, tested the idea and explained the safe outcome.');
    await page.getByRole('radio', { name: lesson.check.options[lesson.check.correct] }).check();
    await page.getByRole('button', { name: /Check practice on server/ }).click();
    await expect(
      page.getByText(new RegExp(`${lessons.indexOf(lesson) + 1} of 4 lessons completed on server`)),
    ).toBeVisible();
  }
  await expectAxeClean(page);
  await page.goto('/pilot');
  await expect(page.getByText(`${lessons.length} recorded actions in these 7 UTC days.`)).toBeVisible();
  await expect(page.getByText('0 of 44 draft courses passed')).toBeVisible();
  await page.locator('.ll-stat-grid').scrollIntoViewIfNeeded();
  await expect.poll(async () => page.locator('.ll-bar-track > span').last().evaluate((bar) => bar.getBoundingClientRect().height)).toBeGreaterThan(0);
  await expect(page.locator('.ll-bars')).toHaveAttribute('aria-label', /: 4(?:;|$)/);
  // A chart animation is presentation of persisted actions, not a generated minutes estimate.
  await expect(page.getByText(/recorded action.*in these 7 UTC days/)).toBeVisible();
  await page.goto('/pilot/courses/course-01');
  for (const [index, check] of lessons
    .map((lesson) => lesson.check)
    .concat([{ question: '', options: [], correct: 0, safetyCritical: false, explanation: '' }])
    .entries()) {
    // The final item is the course transfer check (also graded by the API).
    if (index === 4) {
      const final = page.locator('fieldset').last();
      await final.getByRole('radio').first().check();
    } else {
      const group = page.locator('fieldset').nth(index);
      await group.getByRole('radio', { name: check.options[check.correct] }).check();
    }
  }
  await page.getByRole('button', { name: /Score quiz on server/ }).click();
  await expect(page.getByText('Latest server quiz: 100%')).toBeVisible();
  await page
    .getByLabel('Fictional project or accessible artefact description')
    .fill(
      'I created a fictional learning plan, tested it safely, and checked it includes no real personal information.',
    );
  await page
    .getByLabel('What did you test and learn?')
    .fill('I tested an example and revised how I explained the result.');
  await page.getByRole('checkbox', { name: /fictional or permitted information/ }).check();
  await page.getByRole('button', { name: /Submit for assigned human review/ }).click();
  await expect(page.getByText('Waiting for an assigned human reviewer')).toBeVisible();
  await expectAxeClean(page);
  const submission = (
    await db.query<{ id: string; learner_id: string }>(
      "SELECT id,learner_id FROM pilot.project_submissions WHERE course_id='course-01' AND status='submitted' LIMIT 1",
    )
  ).rows[0];
  expect(submission).toBeDefined();
  let reviewerContext: BrowserContext | undefined;
  try {
    reviewerContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    const reviewerEmail = `sam-${randomUUID().slice(0, 7)}@example.invalid`;
    await register(reviewerPage, 'Sam Reviewer', await invite(reviewerEmail, 'reviewer'));
    await reviewerPage.getByRole('link', { name: 'Assigned reviews', exact: true }).click();
    await expect(
      reviewerPage.getByRole('heading', { name: 'Nothing assigned to review' }),
    ).toBeVisible();
    const reviewerId = (
      await db.query<{ id: string }>('SELECT id FROM pilot.users WHERE email=$1', [reviewerEmail])
    ).rows[0].id;
    await db.query(
      "INSERT INTO pilot.review_assignments (submission_id,reviewer_id,assigned_by) VALUES ($1,$2,'e2e operator')",
      [submission.id, reviewerId],
    );
    await reviewerPage.getByRole('button', { name: 'Refresh queue' }).click();
    await expect(reviewerPage.getByRole('heading', { name: course.title })).toBeVisible();
    await expectAxeClean(reviewerPage);
    for (const dimension of ['project', 'practice', 'reflection', 'safety'])
      await reviewerPage.getByRole('spinbutton', { name: dimension }).fill('85');
    await reviewerPage.getByRole('checkbox', { name: /checked safety and privacy/ }).check();
    await reviewerPage.getByLabel('Review decision').selectOption('approved');
    await reviewerPage
      .getByLabel('Specific learner feedback')
      .fill('A clear fictional example with thoughtful safety decisions and reflection.');
    await reviewerPage.getByRole('button', { name: /Record server-side review/ }).click();
    await expect(
      reviewerPage.getByRole('heading', { name: 'Nothing assigned to review' }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText('Passed in the internal rehearsal')).toBeVisible();
    await page.goto('/pilot');
    await expect(page.getByText('1 of 44 draft courses passed')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue Course 02/ })).toBeVisible();
    await page.goto('/pilot/courses/course-01');
    await page.getByRole('link', { name: /Continue to the next required course/ }).click();
    await expect(page.getByRole('heading', { name: catalog.courses[1].title })).toBeVisible();
  } finally {
    await reviewerContext?.close();
  }
});

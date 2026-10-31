import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDatabase } from '../server/src/db';
import { loadConfig } from '../server/src/config';
import { verifyProjectCore } from '../server/src/project-core/migrate';
import { hexHash } from '../server/src/security';
import type { Database } from '../server/src/db';

const databaseUrl = process.env.PROJECT_CORE_E2E_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).hostname !== '127.0.0.1' ||
    !new URL(databaseUrl).pathname.startsWith('/desloop_project_core_disposable_'))
  throw new Error('Browser test refuses a real/shared/non-loopback database.');
let db: Database;
const password = 'synthetic-browser-only-long-passphrase';
const origin = 'http://127.0.0.1:5173';
async function invite() {
  const token = randomUUID() + randomUUID();
  const email = `fictional-${randomUUID().slice(0, 8)}@example.invalid`;
  await db.query(
    "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES($1,'learner',$2,now()+interval '1 day','local-e2e')",
    [email, hexHash(token)],
  );
  return { token, email };
}
async function register(page: Page, name: string) {
  const { token, email } = await invite();
  await page.goto('/pilot');
  await expect(page.getByRole('heading', { name: 'Adult learning pilot' })).toBeVisible();
  await page.getByRole('tab', { name: 'Use invitation' }).click();
  await page.getByLabel('One-time invitation code').fill(token);
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('checkbox', { name: /I confirm I am an adult internal tester/ }).check();
  await page.getByRole('button', { name: 'Use invitation' }).click();
  await expect(page.getByRole('link', { name: 'Private project documents' })).toBeVisible();
  return email;
}
async function expectNoAxeViolations(page: Page) {
  const issues = (await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations;
  expect(issues, issues.map((item) => `${item.id}: ${item.nodes.map((node) => node.target).join(', ')}`).join('\n')).toEqual([]);
}
test.beforeAll(async () => {
  const config = loadConfig({
    NODE_ENV: 'test', PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
    PROJECT_CORE_ENABLED: 'true', PROJECT_CORE_LOCAL_ACKNOWLEDGED: 'true',
    HOST: '127.0.0.1', APP_ORIGIN: origin, DATABASE_URL: databaseUrl,
  });
  db = createDatabase(config);
  await verifyProjectCore(db); // CI/operator installed 005 on this disposable DB before starting the API.
});
test.afterAll(async () => { await db?.end(); });

test('real local adult browser: save, reopen, stale-tab comparison, replay and cross-account denial', async ({ page, browser }: { page: Page; browser: Browser }) => {
  const email = await register(page, 'Synthetic Owner');
  await page.getByRole('link', { name: 'Private project documents' }).click();
  await expect(page.getByRole('heading', { name: 'Private project documents' })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('textbox', { name: 'Project title' }).fill('Synthetic notebook');
  await page.getByRole('textbox', { name: 'Data-only JSON document' }).fill('{"notes":"Synthetic first page"}');
  await page.getByRole('button', { name: 'Create and save revision 1' }).click();
  await expect(page.getByRole('heading', { name: 'Edit your document' })).toBeVisible();
  const projectId = page.url().split('/').pop()!;
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByRole('textbox', { name: 'Data-only JSON document' })).toHaveValue('{\n  "notes": "Synthetic first page"\n}');
  await expectNoAxeViolations(page);

  const otherTab = await page.context().newPage();
  await otherTab.goto(`/pilot/projects/${projectId}`);
  await expect(otherTab.getByRole('heading', { name: 'Edit your document' })).toBeVisible();
  await otherTab.getByRole('textbox', { name: 'Data-only JSON document' }).fill('{"notes":"Changed in second tab"}');
  await otherTab.getByRole('button', { name: 'Save new server revision' }).click();
  await expect(otherTab.getByText('Revision 2 was saved and reopened from the server.')).toBeVisible();

  await page.getByRole('textbox', { name: 'Data-only JSON document' }).fill('{"notes":"Changed in first tab"}');
  await page.getByRole('button', { name: 'Save new server revision' }).click();
  await expect(page.getByRole('heading', { name: 'Compare before resolving' })).toBeVisible();
  await expect(page.getByText(/Not saved: revision 2 is now latest/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save my text as a new revision' })).toBeDisabled();
  await expectNoAxeViolations(page);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  if (process.env.PROJECT_CORE_CAPTURE_QA === 'true')
    await page.screenshot({ path: test.info().outputPath('private-conflict.png'), fullPage: true });
  await page.getByRole('checkbox', { name: /I compared both documents/ }).check();
  await page.getByRole('button', { name: 'Save my text as a new revision' }).click();
  await expect(page.getByText('Revision 3 was saved and reopened from the server.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Revision number' }).selectOption('2');
  await page.getByRole('button', { name: 'Open read-only revision' }).click();
  await expect(page.getByRole('heading', { name: 'Historical revision 2' })).toBeVisible();
  await expect(page.getByText(/Changed in second tab/)).toBeVisible();
  await page.getByRole('button', { name: 'Close historical view' }).click();

  // The real server commits, but Playwright intentionally drops the response once.
  // The UI must not call an unknown outcome saved; retry uses the server's idempotency ID.
  await page.route('**/api/pilot/project-core/v1/projects/*/revisions', async (route) => {
    await route.fetch();
    await route.abort('failed');
  }, { times: 1 });
  await page.getByRole('textbox', { name: 'Data-only JSON document' }).fill('{"notes":"Response was lost"}');
  await page.getByRole('button', { name: 'Save new server revision' }).click();
  await expect(page.getByText(/Save outcome is unknown/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Data-only JSON document' })).toHaveAttribute('readonly');
  await page.getByRole('button', { name: 'Retry identical save request' }).click();
  await expect(page.getByText(/Revision 4 was saved and reopened from the server \(identical request replay\)/)).toBeVisible();

  const foreignContext = await browser.newContext();
  try {
    const foreign = await foreignContext.newPage();
    await register(foreign, 'Synthetic Other Learner');
    await foreign.goto(`/pilot/projects/${projectId}`);
    await expect(foreign.getByText('This private document is unavailable')).toBeVisible();
    await expect(foreign.getByText('Changed in first tab')).toHaveCount(0);
    await expect(foreign.getByRole('textbox', { name: 'Data-only JSON document' })).toHaveCount(0);
  } finally { await foreignContext.close(); }

  const owner = await db.query<{ id: string }>('SELECT id FROM pilot.users WHERE email=$1', [email]);
  const count = await db.query<{ revisions: string }>(
    'SELECT count(*)::text AS revisions FROM project_core.revisions WHERE project_id=$1 AND owner_id=$2',
    [projectId, owner.rows[0].id],
  );
  expect(count.rows[0].revisions).toBe('4');
  const credit = await db.query<{ total: string }>(
    'SELECT count(*)::text AS total FROM pilot.course_completions WHERE learner_id=$1', [owner.rows[0].id],
  );
  expect(credit.rows[0].total).toBe('0');
});

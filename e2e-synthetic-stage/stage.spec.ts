import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadCatalog } from '../server/src/catalog';
import { loadEngineCatalog } from '../server/src/engine/catalog';
import { LearningEngine } from '../server/src/engine/service';
import { verifyEngineRelease } from '../server/src/engine/migrate';
import { createDatabase } from '../server/src/db';
import { loadConfig } from '../server/src/config';
import { verifyProjectCore } from '../server/src/project-core/migrate';
import { hexHash } from '../server/src/security';
import type { Database } from '../server/src/db';

const raw = process.env.SYNTHETIC_STAGE_E2E_DATABASE_URL;
if (!raw || new URL(raw).hostname !== '127.0.0.1' ||
    new URL(raw).pathname !== '/desloop_project_core_disposable_stage_browser')
  throw new Error('Refuse browser QA without the exact disposable loopback database');
const origin = 'http://127.0.0.1:4012';
const testKey = 'a'.repeat(64); // Synthetic test fixture only.
const password = 'synthetic-browser-only-long-passphrase';
let db: Database;

async function register(page: Page) {
  const token = randomUUID() + randomUUID();
  const email = `stage-${randomUUID().slice(0, 8)}@example.invalid`;
  await db.query(
    "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES($1,'learner',$2,now()+interval '1 day','stage-e2e')",
    [email, hexHash(token)],
  );
  await page.goto('/pilot');
  await expect(page.getByRole('heading', { name: 'Adult learning pilot' })).toBeVisible();
  await page.getByRole('tab', { name: 'Use invitation' }).click();
  await page.getByLabel('One-time invitation code').fill(token);
  await page.getByLabel('Display name').fill('Synthetic Adult');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('checkbox', { name: /I confirm I am an adult internal tester/ }).check();
  await page.getByRole('button', { name: 'Use invitation' }).click();
  await expect(page.getByRole('navigation', { name: 'Pilot navigation' })).toBeVisible();
  const user = await db.query<{ id: string }>('SELECT id FROM pilot.users WHERE email=$1', [email]);
  return user.rows[0].id;
}

test.beforeAll(async () => {
  db = createDatabase(loadConfig({
    NODE_ENV: 'test', PILOT_ENABLED: 'false', DATABASE_URL: raw,
    APP_ORIGIN: origin, HOST: '127.0.0.1',
  }));
  await verifyProjectCore(db);
  await verifyEngineRelease(db, loadEngineCatalog());
  const runtimeUrl = new URL(raw);
  runtimeUrl.username = 'desloop_stage_runtime';
  runtimeUrl.password = 'stage-browser-only-password';
  const limited = createDatabase(loadConfig({ NODE_ENV: 'test', PILOT_ENABLED: 'false',
    DATABASE_URL: runtimeUrl.href, APP_ORIGIN: origin }));
  try {
    const evidence = await limited.query<{
      role: string; schema_create: boolean; child_write: boolean; audit_delete: boolean;
      can_change_role: boolean; project_write: boolean; session_write: boolean; engine_write: boolean;
    }>(`SELECT current_user AS role,
      has_schema_privilege(current_user,'project_core','CREATE') AS schema_create,
      has_table_privilege(current_user,'safeguarding.release_gate','UPDATE') AS child_write,
      has_table_privilege(current_user,'pilot.audit_events','DELETE') AS audit_delete,
      has_column_privilege(current_user,'pilot.users','role','UPDATE') AS can_change_role,
      has_table_privilege(current_user,'project_core.revisions','INSERT') AS project_write,
      has_table_privilege(current_user,'pilot.sessions','INSERT') AS session_write,
      has_table_privilege(current_user,'learning.sandbox_revisions','INSERT') AS engine_write`);
    expect(evidence.rows[0]).toEqual({ role: 'desloop_stage_runtime',
      schema_create: false, child_write: false, audit_delete: false, can_change_role: false,
      project_write: true, session_write: true, engine_write: true });
  } finally { await limited.end(); }
});
test.afterAll(async () => { await db?.end(); });

test('built adult service: outer gate, real draft-2 enrolment, JSON save/reopen, sign-out and WCAG',
  async ({ page }: { page: Page }) => {
    // Node's fetch sends no Playwright-configured Basic credential. APIRequestContext
    // silently inherits project httpCredentials even when constructed independently.
    const denied = await fetch(`${origin}/api/pilot/status`);
    expect(denied.status).toBe(401);
    expect(denied.headers.get('cache-control')).toBe('no-store');
    expect((await fetch(`${origin}/pilot/projects`)).status).toBe(401);
    expect((await fetch(`${origin}/api/pilot/status`, {
      headers: { authorization: `Basic ${Buffer.from('desloop-review:wrong').toString('base64')}` },
    })).status).toBe(401);
    const response = await page.goto('/pilot');
    expect(response?.status()).toBe(200); // Browser answered the actual Basic challenge.
    const userId = await register(page);
    await page.goto('/pilot/courses/course-01');
    const pilotLesson = loadCatalog().courses[0].modules[0].lessons[0];
    await page.getByLabel('Describe your own practice with a fictional example')
      .fill('I tested a safe fictional example, then described the result accurately.');
    await page.getByRole('radio', { name: pilotLesson.check.options[pilotLesson.check.correct] }).check();
    await page.getByRole('button', { name: /Check practice on server/ }).click();
    await expect(page.getByText('1 of 4 lessons completed on server')).toBeVisible();
    const releaseId = await verifyEngineRelease(db, loadEngineCatalog());
    await new LearningEngine(db, loadEngineCatalog(), releaseId).enroll(userId, 'Synthetic Test Operator');
    await page.getByRole('link', { name: 'Draft-2 learning engine' }).click();
    await expect(page.getByRole('heading', { name: 'A new seven-state learning engine' })).toBeVisible();
    await expect(page.getByText('0 of 44 courses passed')).toBeVisible();
    await page.goto('/pilot/engine/courses/course-01');
    const firstLesson = loadEngineCatalog().courses[0].modules[0].lessons[0];
    await page.getByLabel('Describe your safe, fictional practice')
      .fill('I checked a safe fictional example and corrected its steps.');
    await page.getByRole('radio', { name: firstLesson.check.options[firstLesson.check.correct] }).check();
    await page.getByRole('button', { name: /Check required lesson on server/ }).click();
    await expect.poll(async () => {
      const verified = await db.query<{ count: string }>(
        'SELECT count(*) FROM learning.lesson_passes WHERE learner_id=$1 AND lesson_id=$2',
        [userId, firstLesson.id]);
      return Number(verified.rows[0].count);
    }).toBe(1);
    await page.goto('/pilot/engine/studio');
    await page.getByLabel('Fictional project title').fill('A fictional stage story');
    await page.getByRole('button', { name: /Create private project/ }).click();
    await expect(page.getByRole('heading', { name: 'Build a block story' })).toBeVisible();
    await page.goto('/pilot/projects');
    await expect(page.getByRole('heading', { name: 'Private project documents' })).toBeVisible();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual((await page.evaluate(() => window.innerWidth)) + 1);
    await page.getByRole('textbox', { name: 'Project title' }).fill('Fictional stage document');
    await page.getByRole('textbox', { name: 'Data-only JSON document' })
      .fill('{"notes":"A pretend garden, no personal data"}');
    await page.getByRole('button', { name: 'Create and save revision 1' }).click();
    await expect(page.getByRole('heading', { name: 'Edit your document' })).toBeVisible();
    const projectId = page.url().split('/').pop()!;
    const persisted = await db.query<{ owner_id: string; document: { notes: string } }>(
      'SELECT owner_id,document FROM project_core.revisions WHERE project_id=$1 AND revision_no=1', [projectId]);
    expect(persisted.rows[0].owner_id).toBe(userId);
    expect(persisted.rows[0].document.notes).toBe('A pretend garden, no personal data');
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Data-only JSON document' }))
      .toHaveValue('{\n  "notes": "A pretend garden, no personal data"\n}');
    await page.getByRole('button', { name: 'Sign out of pilot' }).click();
    await expect(page.getByRole('heading', { name: 'Pilot sign-in' })).toBeVisible();
    // Basic authentication is NOT an adult account session: sign-out still
    // removes access to stored documents. Close the browser to clear Basic auth.
    expect((await page.request.get('/api/pilot/status')).status()).toBe(200);
    const signedOut = await page.request.get('/api/pilot/project-core/v1/projects');
    expect(signedOut.status()).toBe(401);
    expect(signedOut.headers()['cache-control']).toBe('no-store');
    expect(testKey).toHaveLength(64);
  });

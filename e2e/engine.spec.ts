import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { loadEngineCatalog } from '../server/src/engine/catalog';
import { loadCatalog } from '../server/src/catalog';
import { loadConfig } from '../server/src/config';
import { createDatabase, migrate } from '../server/src/db';
import { migrateEngine, verifyEngineRelease } from '../server/src/engine/migrate';
import { LearningEngine } from '../server/src/engine/service';
import { migrateGuardianGroundwork } from '../server/src/guardian/readiness';
import { hexHash } from '../server/src/security';

const dbUrl = process.env.ENGINE_E2E_DATABASE_URL;
test.skip(!dbUrl, 'Requires a dedicated disposable PostgreSQL DB and running opt-in v2 API.');
test('draft-2 adult learner: private playground stays ungraded; guided visual run unlocks only its lesson', async ({
  page,
}) => {
  const catalog = loadEngineCatalog();
  const db = createDatabase(
    loadConfig({
      PILOT_ENABLED: 'false',
      DATABASE_URL: dbUrl,
      APP_ORIGIN: 'http://127.0.0.1:5173',
    }),
  );
  try {
    await migrate(db, loadCatalog());
    // This test ONLY uses its own ENGINE_E2E_DATABASE_URL; CASCADE is destructive there.
    await db.query(
      'TRUNCATE pilot.users,pilot.invitations,pilot.audit_events RESTART IDENTITY CASCADE',
    );
    await migrateEngine(db, catalog);
    await migrateGuardianGroundwork(db);
    const releaseId = await verifyEngineRelease(db, catalog);
    const invitation = randomUUID() + randomUUID();
    const email = `visual-${randomUUID().slice(0, 8)}@example.invalid`;
    await db.query(
      "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES($1,'learner',$2,now()+interval '1 day','e2e')",
      [email, hexHash(invitation)],
    );
    await page.goto('/pilot');
    await page.getByRole('tab', { name: 'Use invitation' }).click();
    await page.getByLabel('One-time invitation code').fill(invitation);
    await page.getByLabel('Display name').fill('Fictional Adult Tester');
    await page.getByLabel('Password', { exact: true }).fill('a-strong-unique-local-test-password');
    await page.getByLabel(/I confirm I am an adult internal tester/).check();
    await page.getByRole('button', { name: 'Use invitation', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Pilot navigation' })).toBeVisible();
    const user = await db.query<{ id: string }>('SELECT id FROM pilot.users WHERE email=$1', [
      email,
    ]);
    const engine = new LearningEngine(db, catalog, releaseId);
    const learnerId = user.rows[0].id;
    await engine.enroll(learnerId, 'E2E Test Operator');
    await page.getByRole('link', { name: 'Draft-2 learning engine' }).click();
    await expect(
      page.getByRole('heading', { name: 'A new seven-state learning engine' }),
    ).toBeVisible();
    await expect(page.getByText('0 of 44 courses passed')).toBeVisible();
    await page
      .getByLabel('Browse proposed strategy tags (not accreditation)')
      .selectOption('GES_CCP');
    await expect(page.getByText('Only Course 06 passing can unlock this course.')).toBeVisible();
    await page.getByLabel('Browse proposed strategy tags (not accreditation)').selectOption('ALL');
    await page.getByRole('link', { name: /Private free-practice playground/ }).click();
    await page.getByLabel('Fictional project title').fill('A fictional community garden');
    await page.getByRole('button', { name: /Create private project/ }).click();
    await expect(page.getByRole('heading', { name: 'Build a block story' })).toBeVisible();
    await page.getByRole('button', { name: 'Add say block' }).click();
    await page
      .getByRole('textbox', { name: 'Block 2: spoken text (fictional)' })
      .fill('The pretend seeds are planted');
    await page.getByRole('button', { name: 'Add say block' }).click();
    await page
      .getByRole('textbox', { name: 'Block 3: spoken text (fictional)' })
      .fill('The pretend garden grows');
    await page.getByRole('button', { name: /Save private revision/ }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Private revision 1 saved' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Check saved revision on server/ })).toHaveCount(
      0,
    );
    await page.goto('/pilot/engine/courses/course-02');
    await expect(page.getByRole('heading', { name: 'Course is not open' })).toBeVisible();
    await page.goto('/pilot/engine/guided/course-08/c08-l2');
    await expect(page.getByRole('heading', { name: 'Guided lesson is not open' })).toBeVisible();
    const progress = await db.query<{ state: string }>(
      "SELECT state FROM learning.course_progress WHERE learner_id=$1 AND course_id='course-02'",
      [user.rows[0].id],
    );
    expect(progress.rows[0].state).toBe('LOCKED');
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);

    // Exercise the genuine server gates for Courses 01–07, rather than directly
    // updating progress. The reviewer fixture and all writes live only in this
    // disposable database; its password hash is never used for browser login.
    const reviewer = await db.query<{ id: string }>(
      `INSERT INTO pilot.users(email,display_name,password_hash,role,adult_attested_at)
       SELECT $1,'E2E Reviewer',password_hash,'reviewer',now()
       FROM pilot.users WHERE id=$2 RETURNING id`,
      [`visual-reviewer-${randomUUID().slice(0, 8)}@example.invalid`, learnerId],
    );
    const reviewerId = reviewer.rows[0].id;
    const practice = 'I tested a safe fictional story and checked each step in order.';
    for (const requiredCourse of catalog.courses.slice(0, 7)) {
      const lessons = requiredCourse.modules.flatMap((module) => module.lessons);
      for (const lesson of lessons) {
        const result = await engine.lesson(learnerId, requiredCourse.id, lesson.id, {
          practice,
          answerIndex: lesson.check.correct,
          requestId: randomUUID(),
        });
        expect(result.completed).toBe(true);
      }
      const quiz = await engine.quiz(learnerId, requiredCourse.id, {
        answers: lessons.map((lesson) => lesson.check.correct).concat(0),
        requestId: randomUUID(),
      });
      expect(quiz.passed).toBe(true);
      const submission = await engine.submit(learnerId, requiredCourse.id, {
        artefact: 'A fictional safe project with ordered steps and no real student records.',
        reflection: 'I checked a fictional example, found a mistake and improved it.',
        safetyAttested: true,
        requestId: randomUUID(),
      });
      await db.query(
        "INSERT INTO learning.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,'E2E Test Operator')",
        [submission.submissionId, reviewerId],
      );
      expect(
        (
          await engine.review(reviewerId, submission.submissionId, {
            decision: 'approved',
            rubric: { project: 80, practice: 80, reflection: 80, safety: 80 },
            safetyApproved: true,
            feedback: 'Safe, clear fictional evidence and thoughtful revision.',
            requestId: randomUUID(),
          })
        ).completed,
      ).toBe(true);
    }
    await page.goto('/pilot/engine/guided/course-08/c08-l2');
    await expect(page.getByRole('heading', { name: 'Guided lesson is not open' })).toBeVisible();
    const course8 = catalog.courses[7];
    const lesson1 = course8.modules[0].lessons[0];
    await engine.lesson(learnerId, course8.id, lesson1.id, {
      practice,
      answerIndex: lesson1.check.correct,
      requestId: randomUUID(),
    });
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Events and sequences: a fictional two-step story' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Start guided visual project/ }).click();
    await expect(page.getByRole('heading', { name: 'Build a block story' })).toBeVisible();
    await page.getByRole('button', { name: 'Add say block' }).click();
    await page
      .getByRole('textbox', { name: 'Block 2: spoken text (fictional)' })
      .fill('A pretend train stops');
    await page.getByRole('button', { name: /Save private revision/ }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Private revision 1 saved' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Check saved revision on server/ }).click();
    await expect(page.getByText('Guided criteria need revision.', { exact: false })).toBeVisible();
    const failed = await db.query<{ state: string }>(
      "SELECT state FROM learning.course_progress WHERE learner_id=$1 AND course_id='course-08'",
      [learnerId],
    );
    expect(failed.rows[0].state).toBe('FAILED_REMEDIATION');
    await page.getByRole('button', { name: 'Add say block' }).click();
    await page
      .getByRole('textbox', { name: 'Block 3: spoken text (fictional)' })
      .fill('The pretend train continues');
    await page.getByRole('button', { name: /Save private revision/ }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Private revision 2 saved' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Check saved revision on server/ }).click();
    await expect(
      page.getByText('Guided criteria passed on the server.', { exact: false }),
    ).toBeVisible();
    const passedRun = await db.query<{ passed: boolean; revision_no: number }>(
      'SELECT passed,revision_no FROM learning.sandbox_runs WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 1',
      [learnerId],
    );
    expect(passedRun.rows[0]).toMatchObject({ passed: true, revision_no: 2 });
    const guidedAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(guidedAxe.violations).toEqual([]);
    const lesson2 = course8.modules[1].lessons[0];
    await page.goto('/pilot/engine/courses/course-08');
    await page.getByLabel('Describe your safe, fictional practice').fill(practice);
    await page.getByRole('radio', { name: lesson2.check.options[lesson2.check.correct] }).check();
    await page.getByRole('button', { name: /Check required lesson on server/ }).click();
    await expect(
      page.getByRole('progressbar', { name: '2 of 4 lesson checks passed' }),
    ).toBeVisible();
    const lessonPass = await db.query<{ guided_run_id: string | null }>(
      "SELECT guided_run_id FROM learning.lesson_passes WHERE learner_id=$1 AND lesson_id='c08-l2'",
      [learnerId],
    );
    expect(lessonPass.rows[0].guided_run_id).toBeTruthy();
  } finally {
    await db.end();
  }
});

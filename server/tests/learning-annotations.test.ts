import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { buildApi } from '../src/api.js';
import { loadCatalog } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';
import { createDatabase, migrate, migrateAnnotations } from '../src/db.js';
import { hexHash } from '../src/security.js';

const origin = 'http://127.0.0.1:5173';
const catalog = loadCatalog();
const testDb = process.env.LEARNING_ANNOTATIONS_TEST_DATABASE_URL;
if (testDb) {
  const target = new URL(testDb);
  if (target.hostname !== '127.0.0.1' ||
      !target.pathname.startsWith('/desloop_learning_annotations_disposable_'))
    throw new Error('Notes integration tests require their own disposable loopback database.');
}

test('a closed API has no notes or bookmark routes', async () => {
  const app = await buildApi(loadConfig({ NODE_ENV: 'test', APP_ORIGIN: origin }));
  try {
    const response = await app.inject('/api/pilot/courses/course-01/annotations');
    assert.equal(response.statusCode, 404);
    const post = await app.inject({
      method: 'POST', url: '/api/pilot/courses/course-01/lessons/c01-l1/annotation',
      headers: { origin, 'content-type': 'application/json' },
      payload: { note: 'a', bookmarked: true, expectedRevision: 0 },
    });
    assert.equal(post.statusCode, 404);
  } finally {
    await app.close();
  }
});

test('real PostgreSQL notes: owner isolation, CSRF, course gate, version, optimistic conflict, no credit',
  { skip: !testDb }, async () => {
    const config = loadConfig({
      NODE_ENV: 'test', PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
      LEARNING_ANNOTATIONS_ENABLED: 'true',
      APP_ORIGIN: origin, DATABASE_URL: testDb,
    });
    const db = createDatabase(config);
    await migrate(db, catalog);
    await migrateAnnotations(db);
    const app = await buildApi(config, db, catalog);
    type Actor = { id: string; cookie: string; csrf: string };
    const actor = async (role: 'learner' | 'reviewer'): Promise<Actor> => {
      const address = `notebook-${role}-${randomUUID()}@example.invalid`;
      const invitation = randomUUID() + randomUUID();
      await db.query(
        `INSERT INTO pilot.invitations (email,role,token_hash,expires_at,created_by)
         VALUES ($1,$2,$3,now()+interval '1 day','local-test')`,
        [address, role, hexHash(invitation)],
      );
      const response = await app.inject({
        method: 'POST', url: '/api/pilot/auth/register',
        headers: { origin, 'content-type': 'application/json' },
        payload: {
          invitation, name: `Local ${role}`, password: 'a-private-test-only-password', adultAttested: true,
        },
      });
      assert.equal(response.statusCode, 201, response.body);
      const raw = response.headers['set-cookie'];
      assert.ok(raw);
      const cookies = (Array.isArray(raw) ? raw : [raw]).map((value) => value.split(';')[0]);
      const csrf = cookies.find((value) => value.startsWith('desloop_pilot_csrf='))?.split('=')[1];
      assert.ok(csrf);
      return { id: response.json().user.id, cookie: cookies.join('; '), csrf };
    };
    const get = (path: string, account?: Actor) => app.inject({
      method: 'GET', url: path, headers: account ? { cookie: account.cookie } : {},
    });
    const post = (path: string, account: Actor | null, body: object, override: object = {}) =>
      app.inject({
        method: 'POST', url: path,
        headers: {
          origin, 'content-type': 'application/json',
          ...(account ? { cookie: account.cookie, 'x-csrf-token': account.csrf } : {}),
          ...override,
        },
        payload: body,
      });
    const listPath = '/api/pilot/courses/course-01/annotations';
    const lessonId = catalog.courses[0].modules[0].lessons[0].id;
    const writePath = `/api/pilot/courses/course-01/lessons/${lessonId}/annotation`;
    const body = { note: 'My own quiet plan for this lesson.', bookmarked: true, expectedRevision: 0 };
    try {
      const learner = await actor('learner');
      const second = await actor('learner');
      const reviewer = await actor('reviewer');
      assert.equal((await get(listPath)).statusCode, 401);
      assert.equal((await get(listPath, reviewer)).statusCode, 403);
      assert.equal((await get('/api/pilot/courses/course-02/annotations', learner)).statusCode, 423);
      assert.equal((await get('/api/pilot/courses/course-99/annotations', learner)).statusCode, 404);
      const empty = await get(listPath, learner);
      assert.equal(empty.statusCode, 200);
      assert.equal(empty.headers['cache-control'], 'private, no-store');
      assert.deepEqual(empty.json().items, []);
      assert.equal((await post(writePath, null, body)).statusCode, 401);
      assert.equal((await post(writePath, reviewer, body)).statusCode, 403);
      assert.equal((await post(writePath, learner, body, { origin: 'https://evil.invalid' })).statusCode, 403);
      assert.equal((await post(writePath, learner, body, { 'x-csrf-token': 'incorrect' })).statusCode, 403);
      assert.equal((await post(writePath, learner, { ...body, note: 'x'.repeat(4001) })).statusCode, 422);
      assert.equal((await post(writePath, learner, { ...body, arbitraryUserId: second.id })).statusCode, 422);
      assert.equal((await post(writePath.replace(lessonId, 'c01-l999'), learner, body)).statusCode, 404);
      assert.equal((await post(writePath.replace('course-01', 'course-02'), learner, body)).statusCode, 423);
      const created = await post(writePath, learner, body);
      assert.equal(created.statusCode, 200, created.body);
      assert.equal(created.headers['cache-control'], 'private, no-store');
      assert.equal(created.json().revision, 1);
      assert.equal(created.json().bookmarked, true);
      assert.equal((await get(listPath, learner)).json().items[0].note, body.note);
      assert.deepEqual((await get(listPath, second)).json().items, []);
      assert.equal((await post(writePath, second, { ...body, note: 'Second learner note.' })).statusCode, 200);
      assert.equal((await get(listPath, second)).json().items[0].note, 'Second learner note.');
      assert.equal((await get(listPath, learner)).json().items[0].note, body.note);
      // This is a genuinely persisted value, not a client store or mock response.
      const persisted = await db.query<{ note: string; revision: number }>(
        'SELECT note,revision FROM pilot.lesson_annotations WHERE learner_id=$1 AND course_id=$2',
        [learner.id, 'course-01'],
      );
      assert.deepEqual(persisted.rows.map((row) => row.note), [body.note]);
      assert.equal(persisted.rows[0].revision, 1);
      const success = await post(writePath, learner, {
        note: 'A corrected plan from the same learner.', bookmarked: false, expectedRevision: 1,
      });
      assert.equal(success.statusCode, 200, success.body);
      assert.equal(success.json().revision, 2);
      const stale = await post(writePath, learner, { ...body, expectedRevision: 1 });
      assert.equal(stale.statusCode, 409, stale.body);
      assert.equal(stale.json().error, 'ANNOTATION_CONFLICT');
      const [one, two] = await Promise.all([
        post(writePath, learner, { ...body, note: 'Device A', expectedRevision: 2 }),
        post(writePath, learner, { ...body, note: 'Device B', expectedRevision: 2 }),
      ]);
      assert.deepEqual([one.statusCode, two.statusCode].sort(), [200, 409]);
      assert.equal((await get(listPath, learner)).json().items[0].revision, 3);
      assert.equal((await post(writePath, learner, {
        note: '', bookmarked: false, expectedRevision: 3,
      })).json().revision, 4);
      assert.equal((await get(listPath, learner)).json().items[0].note, '');
      assert.equal((await get('/api/pilot/pathway', learner)).json().completedCount, 0);
      const credit = await db.query('SELECT 1 FROM pilot.lesson_completions WHERE learner_id=$1', [learner.id]);
      assert.equal(credit.rowCount, 0);
      const audits = await db.query<{ detail: object }>(
        "SELECT detail FROM pilot.audit_events WHERE actor_id=$1 AND action='pilot.annotation.saved'",
        [learner.id],
      );
      assert.equal(audits.rowCount, 4);
      assert.ok(!JSON.stringify(audits.rows).includes(body.note));
    } finally {
      await app.close();
      await db.end();
    }
  });

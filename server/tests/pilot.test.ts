import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApi } from '../src/api.js';
import { completedPrefix, loadCatalog, scoreQuiz, scoreRubric } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';
import { createDatabase, migrate } from '../src/db.js';
import { hexHash } from '../src/security.js';

const catalog = loadCatalog();
const origin = 'http://127.0.0.1:5173';
const testDb = process.env.PILOT_TEST_DATABASE_URL;

test('pure policy: 44 ordered courses, stale policy/version and critical checks stay locked', () => {
  assert.equal(catalog.courses.length, 44);
  assert.equal(
    completedPrefix(catalog, [
      { course_id: 'course-02', version: catalog.version, policy_version: 'internal-pilot-1' },
    ]),
    0,
  );
  assert.equal(
    completedPrefix(catalog, [
      { course_id: 'course-01', version: 'old', policy_version: 'internal-pilot-1' },
    ]),
    0,
  );
  assert.equal(
    completedPrefix(catalog, [
      { course_id: 'course-01', version: catalog.version, policy_version: 'old' },
    ]),
    0,
  );
  assert.equal(
    completedPrefix(catalog, [
      { course_id: 'course-01', version: catalog.version, policy_version: 'internal-pilot-1' },
    ]),
    1,
  );
  const safetyCourse = catalog.courses.find((course) => course.safetyCritical)!;
  const correct = safetyCourse.modules
    .flatMap((module) => module.lessons.map((lesson) => lesson.check.correct))
    .concat(0);
  const criticalIndex = safetyCourse.modules
    .flatMap((module) => module.lessons.map((lesson) => lesson.check))
    .findIndex((check) => check.safetyCritical);
  assert.ok(criticalIndex >= 0);
  const unsafe = [...correct];
  unsafe[criticalIndex] = (unsafe[criticalIndex] + 1) % 3;
  const result = scoreQuiz(safetyCourse, unsafe);
  assert.equal(result.score, 80);
  assert.equal(result.criticalPassed, false);
  assert.equal(
    scoreRubric(catalog.courses[43], 80, {
      scope: 80,
      project: 80,
      design: 80,
      technical: 80,
      testing: 80,
      safety: 80,
      presentation: 80,
    }).project,
    80,
  );
  assert.throws(() =>
    scoreRubric(catalog.courses[0], 80, {
      project: 100,
      practice: 100,
      reflection: 100,
      safety: -1,
    }),
  );
});

test('disabled service exposes no sign-up or progression endpoints', async () => {
  const app = await buildApi(
    loadConfig({ NODE_ENV: 'test', PILOT_ENABLED: 'false', APP_ORIGIN: origin }),
    undefined,
    catalog,
  );
  try {
    assert.equal((await app.inject('/api/pilot/status')).json().enabled, false);
    const denied = await app.inject({
      method: 'POST',
      url: '/api/pilot/auth/register',
      headers: { origin, 'content-type': 'application/json' },
      payload: {},
    });
    assert.equal(denied.statusCode, 404);
  } finally {
    await app.close();
  }
});

test(
  'PostgreSQL pilot: invite, auth, ordered gates, revision and assigned review',
  { skip: !testDb },
  async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      PILOT_ENABLED: 'true',
      PILOT_DRAFT_ACKNOWLEDGED: 'true',
      APP_ORIGIN: origin,
      DATABASE_URL: testDb,
    });
    const db = createDatabase(config);
    await migrate(db, catalog);
    await db.query(
      'TRUNCATE pilot.users, pilot.invitations, pilot.audit_events RESTART IDENTITY CASCADE',
    );
    const app = await buildApi(config, db, catalog);
    const password = 'long-only-for-this-internal-test';
    type Actor = { id: string; cookie: string; csrf: string; email: string };
    const createActor = async (role: 'learner' | 'reviewer', name: string): Promise<Actor> => {
      const email = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@example.invalid`;
      const invitation = randomUUID() + randomUUID();
      await db.query(
        "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES ($1,$2,$3,now()+interval '1 day','test')",
        [email, role, hexHash(invitation)],
      );
      const registered = await app.inject({
        method: 'POST',
        url: '/api/pilot/auth/register',
        headers: { origin, 'content-type': 'application/json' },
        payload: { invitation, name, password, adultAttested: true },
      });
      assert.equal(registered.statusCode, 201, registered.body);
      const rawCookies = registered.headers['set-cookie'];
      assert.ok(rawCookies);
      const cookies = (Array.isArray(rawCookies) ? rawCookies : [rawCookies]).map(
        (item) => item.split(';')[0],
      );
      const csrf = cookies.find((item) => item.includes('desloop_pilot_csrf='))?.split('=')[1];
      assert.ok(csrf);
      return {
        id: registered.json().user.id,
        email,
        cookie: cookies.join('; '),
        csrf: decodeURIComponent(csrf),
      };
    };
    const get = (url: string, actor?: Actor) =>
      app.inject({ method: 'GET', url, headers: actor ? { cookie: actor.cookie } : {} });
    const post = (
      url: string,
      actor: Actor | null,
      payload: object,
      originHeader = origin,
      csrf = true,
    ) =>
      app.inject({
        method: 'POST',
        url,
        headers: {
          origin: originHeader,
          'content-type': 'application/json',
          ...(actor
            ? { cookie: actor.cookie, ...(csrf ? { 'x-csrf-token': actor.csrf } : {}) }
            : {}),
        },
        payload,
      });
    try {
      const learner = await createActor('learner', 'Casey');
      const learner2 = await createActor('learner', 'Taylor');
      const reviewer = await createActor('reviewer', 'Sam');
      const stranger = await createActor('reviewer', 'Morgan');
      assert.equal((await get('/api/pilot/pathway')).statusCode, 401);
      assert.equal((await get('/api/pilot/pathway', reviewer)).statusCode, 403);
      assert.equal((await get('/api/pilot/pathway', learner)).json().completedCount, 0);
      const courseResponse = (await get('/api/pilot/courses/course-01', learner)).json();
      assert.equal(courseResponse.course.modules[0].lessons[0].check.correct, undefined);
      assert.equal(courseResponse.course.quiz[0].correct, undefined);
      assert.equal((await get('/api/pilot/courses/course-02', learner)).statusCode, 423);
      assert.equal(
        (
          await post('/api/pilot/courses/course-01/quiz', learner, {
            answers: [0, 0, 0, 0, 0],
            requestId: randomUUID(),
          })
        ).statusCode,
        423,
      );
      const first = catalog.courses[0];
      const lessons = first.modules.flatMap((module) => module.lessons);
      const urlFor = (id: string) => `/api/pilot/courses/course-01/lessons/${id}`;
      const practice = 'I used a fictional example, checked my choice and explained the result.';
      let firstLessonRequestId = '';
      assert.equal(
        (
          await post(
            urlFor(lessons[0].id),
            learner,
            {
              practice,
              answerIndex: lessons[0].check.correct,
              responseMode: 'typed',
              requestId: randomUUID(),
            },
            'https://evil.example',
          )
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await post(
            urlFor(lessons[0].id),
            learner,
            {
              practice,
              answerIndex: lessons[0].check.correct,
              responseMode: 'typed',
              requestId: randomUUID(),
            },
            origin,
            false,
          )
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await post(urlFor(lessons[1].id), learner, {
            practice,
            answerIndex: lessons[1].check.correct,
            responseMode: 'typed',
            requestId: randomUUID(),
          })
        ).statusCode,
        423,
      );
      const wrong = await post(urlFor(lessons[0].id), learner, {
        practice,
        answerIndex: (lessons[0].check.correct + 1) % 3,
        responseMode: 'typed',
        requestId: randomUUID(),
      });
      assert.equal(wrong.json().completed, false);
      for (const lesson of lessons) {
        const requestId = randomUUID();
        if (lesson === lessons[0]) firstLessonRequestId = requestId;
        const body = {
          practice,
          answerIndex: lesson.check.correct,
          responseMode: 'typed',
          requestId,
        };
        const pass = await post(urlFor(lesson.id), learner, body);
        assert.equal(pass.statusCode, 200, pass.body);
        assert.equal(pass.json().completed, true);
        if (lesson === lessons[0])
          assert.equal((await post(urlFor(lesson.id), learner, body)).json().repeated, true);
      }
      const checkAnswers = lessons.map((lesson) => lesson.check.correct).concat(0);
      const failed = await post('/api/pilot/courses/course-01/quiz', learner, {
        answers: [
          ...checkAnswers.slice(0, 3),
          (checkAnswers[3] + 1) % 3,
          (checkAnswers[4] + 1) % 3,
        ],
        requestId: randomUUID(),
      });
      assert.equal(failed.json().score, 60);
      assert.equal(failed.json().passed, false);
      assert.equal(
        (
          await post('/api/pilot/courses/course-01/project', learner, {
            artefact: 'A safe fictional project description longer than forty characters.',
            reflection: 'I checked every example before sharing.',
            responseMode: 'typed',
            safetyAttested: true,
            requestId: randomUUID(),
          })
        ).statusCode,
        423,
      );
      const quizRequestId = randomUUID();
      const passed = await post('/api/pilot/courses/course-01/quiz', learner, {
        answers: checkAnswers,
        requestId: quizRequestId,
      });
      assert.equal(passed.json().passed, true);
      assert.equal(
        (
          await post('/api/pilot/courses/course-01/quiz', learner, {
            answers: checkAnswers,
            requestId: quizRequestId,
          })
        ).json().repeated,
        true,
      );
      assert.equal(
        (
          await post('/api/pilot/courses/course-01/project', learner, {
            artefact: 'A safe fictional project description longer than forty characters.',
            reflection: 'I checked every example before sharing.',
            responseMode: 'typed',
            safetyAttested: false,
            requestId: randomUUID(),
          })
        ).statusCode,
        422,
      );
      const projectBody = {
        artefact: 'A safe fictional project description longer than forty characters.',
        reflection: 'I checked every example before sharing.',
        responseMode: 'typed',
        safetyAttested: true,
        requestId: randomUUID(),
      };
      const submitted = await post('/api/pilot/courses/course-01/project', learner, projectBody);
      assert.equal(submitted.statusCode, 201, submitted.body);
      const submissionId = submitted.json().submissionId;
      assert.equal(
        (await post('/api/pilot/courses/course-01/project', learner, projectBody)).json().repeated,
        true,
      );
      assert.equal((await get('/api/pilot/pathway', learner)).json().courses[0].state, 'review');
      assert.equal((await get('/api/pilot/reviews', reviewer)).json().queue.length, 0);
      assert.equal(
        (
          await post(`/api/pilot/reviews/${submissionId}`, stranger, {
            decision: 'approved',
            rubric: { project: 90, practice: 90, reflection: 90, safety: 90 },
            safetyApproved: true,
            feedback: 'Great work on a safe example.',
          })
        ).statusCode,
        404,
      );
      await db.query(
        "INSERT INTO pilot.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,'test operator')",
        [submissionId, reviewer.id],
      );
      assert.equal((await get('/api/pilot/reviews', reviewer)).json().queue.length, 1);
      const weak = {
        decision: 'approved',
        rubric: { project: 68, practice: 80, reflection: 80, safety: 80 },
        safetyApproved: true,
        feedback: 'Improve your project evidence.',
      };
      assert.equal(
        (await post(`/api/pilot/reviews/${submissionId}`, reviewer, weak)).statusCode,
        422,
      );
      const revision = await post(`/api/pilot/reviews/${submissionId}`, reviewer, {
        ...weak,
        decision: 'revision_requested',
      });
      assert.equal(revision.statusCode, 200, revision.body);
      assert.equal(revision.json().completed, false);
      assert.equal((await get('/api/pilot/pathway', learner)).json().courses[0].state, 'revision');
      const newSubmission = await post('/api/pilot/courses/course-01/project', learner, {
        ...projectBody,
        artefact: 'A revised fictional project with clearer evidence and a careful privacy check.',
        requestId: randomUUID(),
      });
      const updatedId = newSubmission.json().submissionId;
      await db.query(
        "INSERT INTO pilot.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,'test operator')",
        [updatedId, reviewer.id],
      );
      const reviewBody = {
        decision: 'approved',
        rubric: { project: 85, practice: 85, reflection: 85, safety: 85 },
        safetyApproved: true,
        feedback: 'Clear explanation and safe fictional work.',
      };
      const approved = await post(`/api/pilot/reviews/${updatedId}`, reviewer, reviewBody);
      assert.equal(approved.statusCode, 200, approved.body);
      assert.equal(approved.json().completed, true);
      assert.equal(approved.json().nextCourseId, 'course-02');
      assert.equal((await get('/api/pilot/pathway', learner)).json().completedCount, 1);
      assert.equal((await get('/api/pilot/courses/course-02', learner)).statusCode, 200);
      assert.equal((await get('/api/pilot/courses/course-02', learner2)).statusCode, 423);
      const nextLesson = catalog.courses[1].modules[0].lessons[0];
      assert.equal(
        (
          await post(`/api/pilot/courses/course-02/lessons/${nextLesson.id}`, learner, {
            practice,
            answerIndex: nextLesson.check.correct,
            responseMode: 'typed',
            requestId: firstLessonRequestId,
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await post('/api/pilot/courses/course-02/quiz', learner, {
            answers: checkAnswers,
            requestId: quizRequestId,
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await post('/api/pilot/courses/course-02/project', learner, {
            ...projectBody,
            requestId: projectBody.requestId,
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await post(urlFor(lessons[0].id), learner, {
            practice,
            answerIndex: lessons[0].check.correct,
            responseMode: 'typed',
            requestId: randomUUID(),
          })
        ).statusCode,
        423,
      );
      const extra = await db.query(
        'SELECT count(*)::int AS count FROM pilot.course_completions WHERE learner_id=$1',
        [learner.id],
      );
      assert.equal(extra.rows[0].count, 1);
      const audit = await db.query('SELECT count(*)::int AS count FROM pilot.audit_events');
      assert.ok(audit.rows[0].count >= 8);
      await assert.rejects(
        db.query(
          "UPDATE pilot.audit_events SET action='tampered' WHERE id=(SELECT min(id) FROM pilot.audit_events)",
        ),
        /Audit events are append only/,
      );
      const signedOut = await post('/api/pilot/auth/logout', learner, {});
      assert.equal(signedOut.statusCode, 200);
      assert.equal((await get('/api/pilot/me', learner)).statusCode, 401);
      const wrongLogin = await app.inject({
        method: 'POST',
        url: '/api/pilot/auth/login',
        headers: { origin, 'content-type': 'application/json' },
        payload: { email: learner.email, password: 'wrong-password' },
      });
      assert.equal(wrongLogin.statusCode, 401);
      // Test HTTPS cookie semantics without enabling an un-gated public adult origin.
      // A browser-reachable production origin now requires the independent stage gate.
      const secureConfig = loadConfig({
        NODE_ENV: 'production',
        PILOT_ENABLED: 'true',
        PILOT_DRAFT_ACKNOWLEDGED: 'true',
        APP_ORIGIN: 'https://no-public-origin.invalid',
        DATABASE_URL: testDb,
      });
      const secureApp = await buildApi(secureConfig, db, catalog);
      try {
        const secureToken = randomUUID() + randomUUID();
        await db.query(
          "INSERT INTO pilot.invitations (email,role,token_hash,expires_at,created_by) VALUES ($1,'learner',$2,now()+interval '1 day','test')",
          ['secure@example.invalid', hexHash(secureToken)],
        );
        const secureRegistration = await secureApp.inject({
          method: 'POST',
          url: '/api/pilot/auth/register',
          headers: { origin: secureConfig.appOrigin, 'content-type': 'application/json' },
          payload: {
            invitation: secureToken,
            name: 'Secure tester',
            password,
            adultAttested: true,
          },
        });
        assert.equal(secureRegistration.statusCode, 201);
        const setCookie = secureRegistration.headers['set-cookie'];
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        assert.ok(
          cookies.some(
            (item) =>
              item?.startsWith('__Host-desloop_pilot_sid=') &&
              item.includes('Secure') &&
              item.includes('HttpOnly'),
          ),
        );
        assert.ok(
          cookies.some(
            (item) =>
              item?.startsWith('__Host-desloop_pilot_csrf=') &&
              item.includes('Secure') &&
              !item.includes('HttpOnly'),
          ),
        );
        assert.match(
          secureRegistration.headers['content-security-policy'] ?? '',
          /default-src 'self'/,
        );
      } finally {
        await secureApp.close();
      }
      await db.query("UPDATE pilot.users SET status='disabled' WHERE id=$1", [learner2.id]);
      assert.equal((await get('/api/pilot/pathway', learner2)).statusCode, 401);
      assert.equal((await get('/api/pilot/pathway', learner)).statusCode, 401);
    } finally {
      await app.close();
      await db.end();
    }
  },
);

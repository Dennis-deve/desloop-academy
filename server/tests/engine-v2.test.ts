import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApi } from '../src/api.js';
import { loadCatalog } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';
import { createDatabase, migrate } from '../src/db.js';
import { loadEngineCatalog } from '../src/engine/catalog.js';
import { migrateEngine, verifyEngineRelease } from '../src/engine/migrate.js';
import { LearningEngine } from '../src/engine/service.js';
import { hexHash } from '../src/security.js';

const url = process.env.ENGINE_TEST_DATABASE_URL;
const origin = 'http://127.0.0.1:5173';
const pilot = loadCatalog();
const candidate = loadEngineCatalog();
type Actor = { id: string; email: string; cookie: string; csrf: string };

test(
  'v2 PostgreSQL: authored tags, seven states, assigned review and strict next-course unlock',
  { skip: !url, timeout: 120_000 },
  async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      PILOT_ENABLED: 'true',
      PILOT_DRAFT_ACKNOWLEDGED: 'true',
      ENGINE_V2_ENABLED: 'true',
      ENGINE_DRAFT_ACKNOWLEDGED: 'true',
      DATABASE_URL: url,
      APP_ORIGIN: origin,
    });
    const db = createDatabase(config);
    await migrate(db, pilot);
    // Disposable test-only reset. CASCADE also clears tag hints through the reviewer FK.
    await db.query(
      'TRUNCATE pilot.users,pilot.invitations,pilot.audit_events RESTART IDENTITY CASCADE',
    );
    await migrateEngine(db, candidate);
    await migrateEngine(db, candidate); // Safe to re-run, never overwrite the old pilot release.
    const releaseId = await verifyEngineRelease(db, candidate);
    const engine = new LearningEngine(db, candidate, releaseId);
    const app = await buildApi(config, db, pilot);
    const password = 'long-only-for-our-disposable-v2-test';
    const createActor = async (role: 'learner' | 'reviewer', name: string): Promise<Actor> => {
      const email = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@example.invalid`;
      const invitation = randomUUID() + randomUUID();
      await db.query(
        "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES($1,$2,$3,now()+interval '1 day','test')",
        [email, role, hexHash(invitation)],
      );
      const response = await app.inject({
        method: 'POST',
        url: '/api/pilot/auth/register',
        headers: { origin, 'content-type': 'application/json' },
        payload: { invitation, name, password, adultAttested: true },
      });
      assert.equal(response.statusCode, 201, response.body);
      const raw = response.headers['set-cookie'];
      const cookies = (Array.isArray(raw) ? raw : [raw!]).map((line) => line.split(';')[0]);
      const csrf = cookies.find((line) => line.includes('desloop_pilot_csrf='))?.split('=')[1];
      assert.ok(csrf);
      return {
        id: response.json().user.id,
        email,
        cookie: cookies.join('; '),
        csrf: decodeURIComponent(csrf),
      };
    };
    const get = (path: string, actor?: Actor) =>
      app.inject({ method: 'GET', url: path, headers: actor ? { cookie: actor.cookie } : {} });
    const post = (
      path: string,
      actor: Actor | null,
      payload: object,
      overrideOrigin = origin,
      withCsrf = true,
    ) =>
      app.inject({
        method: 'POST',
        url: path,
        headers: {
          origin: overrideOrigin,
          'content-type': 'application/json',
          ...(actor
            ? { cookie: actor.cookie, ...(withCsrf ? { 'x-csrf-token': actor.csrf } : {}) }
            : {}),
        },
        payload,
      });
    const projectRubric = { project: 80, practice: 80, reflection: 80, safety: 80 };
    const practice = 'I tested a fictional, safe example and described how I checked the outcome.';
    async function completeCourse(actor: Actor, reviewer: Actor, number: number) {
      const course = candidate.courses[number - 1];
      const lessons = course.modules.flatMap((module) => module.lessons);
      for (const lesson of lessons) {
        const checked = await post(
          `/api/pilot/engine/courses/${course.id}/lessons/${lesson.id}`,
          actor,
          { practice, answerIndex: lesson.check.correct, requestId: randomUUID() },
        );
        assert.equal(checked.statusCode, 200, checked.body);
        assert.equal(checked.json().completed, true);
      }
      const quiz = await post(`/api/pilot/engine/courses/${course.id}/quiz`, actor, {
        answers: lessons.map((lesson) => lesson.check.correct).concat(0),
        requestId: randomUUID(),
      });
      assert.equal(quiz.statusCode, 200, quiz.body);
      assert.equal(quiz.json().passed, true);
      const submitted = await post(`/api/pilot/engine/courses/${course.id}/project`, actor, {
        artefact: 'A fictional educational work with no contact details or real student records.',
        reflection: 'I tested it, improved it, and explained a privacy check.',
        safetyAttested: true,
        requestId: randomUUID(),
      });
      assert.equal(submitted.statusCode, 201, submitted.body);
      const submissionId = submitted.json().submissionId;
      await db.query(
        "INSERT INTO learning.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,'integration-test')",
        [submissionId, reviewer.id],
      );
      const approved = await post(`/api/pilot/engine/reviews/${submissionId}`, reviewer, {
        decision: 'approved',
        rubric: projectRubric,
        safetyApproved: true,
        feedback: 'Good evidence and a clear safety explanation.',
        requestId: randomUUID(),
      });
      assert.equal(approved.statusCode, 200, approved.body);
      assert.equal(approved.json().completed, true);
      return approved.json();
    }
    try {
      assert.equal((await get('/api/pilot/engine/pathway')).statusCode, 401);
      assert.equal(
        (await get('/api/pilot/engine/pathway', await createActor('reviewer', 'Queue'))).statusCode,
        403,
      );
      const learner = await createActor('learner', 'Casey');
      const reviewer = await createActor('reviewer', 'Morgan');
      const other = await createActor('learner', 'Taylor');
      assert.equal((await get('/api/pilot/engine/pathway', learner)).statusCode, 403);
      assert.equal((await get('/api/pilot/engine/studio', learner)).statusCode, 403);
      await engine.enroll(learner.id, 'Local Integration Operator');
      await engine.enroll(other.id, 'Local Integration Operator');
      assert.equal((await engine.enroll(learner.id, 'Local Integration Operator')).repeated, true);
      const pathway = (await get('/api/pilot/engine/pathway', learner)).json();
      assert.equal(pathway.courses.length, 44);
      assert.equal(pathway.courses[0].state, 'AVAILABLE');
      assert.equal(pathway.courses[1].state, 'LOCKED');
      assert.equal((await get('/api/pilot/engine/courses/course-02', learner)).statusCode, 423);
      assert.equal(
        (
          await post('/api/pilot/engine/courses/course-02/lessons/c02-l1', learner, {
            practice,
            answerIndex: 0,
            requestId: randomUUID(),
          })
        ).statusCode,
        423,
      );
      assert.equal(
        (
          await post(
            '/api/pilot/engine/courses/course-01/lessons/c01-l1',
            learner,
            { practice, answerIndex: 0, requestId: randomUUID() },
            'https://evil.example',
          )
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await post(
            '/api/pilot/engine/courses/course-01/lessons/c01-l1',
            learner,
            { practice, answerIndex: 0, requestId: randomUUID() },
            origin,
            false,
          )
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await post('/api/pilot/engine/courses/course-01/quiz', reviewer, {
            answers: [0, 0, 0, 0, 0],
            requestId: randomUUID(),
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await post('/api/pilot/engine/courses/course-01/quiz', learner, {
            answers: [0, 0, 0, 0, 0],
            requestId: randomUUID(),
            completed: true,
          })
        ).statusCode,
        422,
      );

      const free = await post('/api/pilot/engine/studio', learner, {
        scope: 'PLAYGROUND',
        title: 'Fictional story',
        requestId: randomUUID(),
      });
      assert.equal(free.statusCode, 201, free.body);
      const freeId = free.json().id;
      const draft = {
        format: 'desloop-visual-v1',
        steps: [
          { kind: 'START' },
          { kind: 'SAY', text: 'A pretend train arrives' },
          { kind: 'SAY', text: 'The pretend train departs' },
        ],
      };
      const saved = await post(`/api/pilot/engine/studio/projects/${freeId}/revisions`, learner, {
        document: draft,
        requestId: randomUUID(),
      });
      assert.equal(saved.statusCode, 201, saved.body);
      assert.equal(saved.json().revisionNo, 1);
      assert.equal(
        (await get(`/api/pilot/engine/studio/projects/${freeId}`, other)).statusCode,
        404,
      );
      assert.equal(
        (await get('/api/pilot/engine/studio', learner)).json().projects[0].scope,
        'PLAYGROUND',
      );
      assert.equal(
        (
          await post(`/api/pilot/engine/studio/projects/${freeId}/run`, learner, {
            revisionNo: 1,
            requestId: randomUUID(),
          })
        ).statusCode,
        422,
      );
      assert.equal(
        (await db.query('SELECT count(*) FROM learning.sandbox_runs')).rows[0].count,
        '0',
      );

      const course = candidate.courses[0];
      const lessons = course.modules.flatMap((module) => module.lessons);
      const wrong = await post('/api/pilot/engine/courses/course-01/lessons/c01-l1', learner, {
        practice,
        answerIndex: (lessons[0].check.correct + 1) % 3,
        requestId: randomUUID(),
      });
      assert.equal(wrong.statusCode, 200, wrong.body);
      assert.equal(wrong.json().completed, false);
      let detail = (await get('/api/pilot/engine/courses/course-01', learner)).json();
      assert.equal(detail.state, 'FAILED_REMEDIATION');
      assert.equal(detail.moduleStates[0].state, 'FAILED_REMEDIATION');
      const rightBody = {
        practice,
        answerIndex: lessons[0].check.correct,
        requestId: randomUUID(),
      };
      const first = await post(
        '/api/pilot/engine/courses/course-01/lessons/c01-l1',
        learner,
        rightBody,
      );
      assert.equal(first.statusCode, 200, first.body);
      assert.equal(
        (
          await post('/api/pilot/engine/courses/course-01/lessons/c01-l1', learner, rightBody)
        ).json().repeated,
        true,
      );
      for (const lesson of lessons.slice(1)) {
        const passed = await post(
          `/api/pilot/engine/courses/course-01/lessons/${lesson.id}`,
          learner,
          { practice, answerIndex: lesson.check.correct, requestId: randomUUID() },
        );
        assert.equal(passed.statusCode, 200, passed.body);
      }
      const failedQuiz = await post('/api/pilot/engine/courses/course-01/quiz', learner, {
        answers: lessons
          .map((l) => l.check.correct)
          .slice(0, 3)
          .concat([(lessons[3].check.correct + 1) % 3, 1]),
        requestId: randomUUID(),
      });
      assert.equal(failedQuiz.statusCode, 200, failedQuiz.body);
      assert.equal(failedQuiz.json().passed, false);
      detail = (await get('/api/pilot/engine/courses/course-01', learner)).json();
      assert.equal(detail.state, 'FAILED_REMEDIATION');
      const passedQuiz = await post('/api/pilot/engine/courses/course-01/quiz', learner, {
        answers: lessons.map((l) => l.check.correct).concat(0),
        requestId: randomUUID(),
      });
      assert.equal(passedQuiz.statusCode, 200, passedQuiz.body);
      assert.equal(passedQuiz.json().passed, true);
      const submitBody = {
        artefact: 'A fictional learning plan and checklist; no real names or private data.',
        reflection: 'I tested it with a second fictional example and improved it.',
        safetyAttested: true,
        requestId: randomUUID(),
      };
      const submitted = await post(
        '/api/pilot/engine/courses/course-01/project',
        learner,
        submitBody,
      );
      assert.equal(submitted.statusCode, 201, submitted.body);
      assert.equal(
        (await get('/api/pilot/engine/courses/course-01', learner)).json().state,
        'SUBMITTED_FOR_REVIEW',
      );
      assert.equal((await get('/api/pilot/engine/courses/course-02', learner)).statusCode, 423);
      await db.query(
        "INSERT INTO learning.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,'integration-test')",
        [submitted.json().submissionId, reviewer.id],
      );
      const needs = await post(
        `/api/pilot/engine/reviews/${submitted.json().submissionId}`,
        reviewer,
        {
          decision: 'revision_requested',
          rubric: { project: 40, practice: 80, reflection: 70, safety: 80 },
          safetyApproved: false,
          feedback: 'Revise the fictional plan and explain your tests.',
          requestId: randomUUID(),
        },
      );
      assert.equal(needs.statusCode, 200, needs.body);
      assert.equal(
        (await get('/api/pilot/engine/courses/course-01', learner)).json().state,
        'NEEDS_REVISION',
      );
      assert.equal((await get('/api/pilot/engine/courses/course-02', learner)).statusCode, 423);
      const revised = await post('/api/pilot/engine/courses/course-01/project', learner, {
        ...submitBody,
        requestId: randomUUID(),
      });
      assert.equal(revised.statusCode, 201, revised.body);
      await db.query(
        "INSERT INTO learning.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,'integration-test')",
        [revised.json().submissionId, reviewer.id],
      );
      const approvedBody = {
        decision: 'approved',
        rubric: projectRubric,
        safetyApproved: true,
        feedback: 'The revision meets the project and safety rubric.',
        requestId: randomUUID(),
      };
      const approved = await post(
        `/api/pilot/engine/reviews/${revised.json().submissionId}`,
        reviewer,
        approvedBody,
      );
      assert.equal(approved.statusCode, 200, approved.body);
      assert.equal(approved.json().nextCourseId, 'course-02');
      assert.equal(
        (
          await post(
            `/api/pilot/engine/reviews/${revised.json().submissionId}`,
            reviewer,
            approvedBody,
          )
        ).json().repeated,
        true,
      );
      const updated = (await get('/api/pilot/engine/pathway', learner)).json();
      assert.equal(updated.completedCount, 1);
      assert.equal(updated.courses[0].state, 'COMPLETED');
      assert.equal(updated.courses[1].state, 'AVAILABLE');
      assert.equal(updated.courses[2].state, 'LOCKED');
      assert.equal((await get('/api/pilot/engine/pathway', other)).json().completedCount, 0);
      assert.equal(
        (
          await db.query('SELECT count(*) FROM learning.course_completions WHERE learner_id=$1', [
            learner.id,
          ])
        ).rows[0].count,
        '1',
      );
      const snapshot = await db.query(
        "SELECT state FROM learning.module_progress WHERE learner_id=$1 AND course_id='course-01' ORDER BY module_id",
        [learner.id],
      );
      assert.equal(snapshot.rows[3].state, 'COMPLETED');

      // Complete Courses 02–07 normally: no direct SQL state or completion forgery.
      for (let i = 2; i <= 7; i++) await completeCourse(learner, reviewer, i);
      assert.equal(
        (await get('/api/pilot/engine/pathway', learner)).json().currentCourseId,
        'course-08',
      );
      assert.equal(
        (await get('/api/pilot/engine/studio/guided/course-08/c08-l2/brief', learner)).statusCode,
        423,
      );
      const visualLesson = candidate.courses[7].modules[0].lessons[0];
      assert.equal(
        (
          await post('/api/pilot/engine/courses/course-08/lessons/c08-l1', learner, {
            practice,
            answerIndex: visualLesson.check.correct,
            requestId: randomUUID(),
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (await get('/api/pilot/engine/studio/guided/course-08/c08-l2/brief', learner)).statusCode,
        200,
      );
      assert.equal(
        (
          await post('/api/pilot/engine/courses/course-08/lessons/c08-l2', learner, {
            practice,
            answerIndex: candidate.courses[7].modules[1].lessons[0].check.correct,
            requestId: randomUUID(),
          })
        ).statusCode,
        423,
      );
      const guided = await post('/api/pilot/engine/studio', learner, {
        scope: 'GUIDED',
        title: 'Fictional train story',
        courseId: 'course-08',
        lessonId: 'c08-l2',
        requestId: randomUUID(),
      });
      assert.equal(guided.statusCode, 201, guided.body);
      const guidedId = guided.json().id;
      const incomplete = await post(
        `/api/pilot/engine/studio/projects/${guidedId}/revisions`,
        learner,
        {
          document: {
            format: 'desloop-visual-v1',
            steps: [{ kind: 'SAY', text: 'A pretend train arrives' }],
          },
          requestId: randomUUID(),
        },
      );
      assert.equal(incomplete.statusCode, 201, incomplete.body);
      const runFail = await post(`/api/pilot/engine/studio/projects/${guidedId}/run`, learner, {
        revisionNo: 1,
        requestId: randomUUID(),
      });
      assert.equal(runFail.statusCode, 200, runFail.body);
      assert.equal(runFail.json().passed, false);
      assert.equal(
        (await get('/api/pilot/engine/courses/course-08', learner)).json().state,
        'FAILED_REMEDIATION',
      );
      const finalRevision = await post(
        `/api/pilot/engine/studio/projects/${guidedId}/revisions`,
        learner,
        { document: draft, requestId: randomUUID() },
      );
      assert.equal(finalRevision.statusCode, 201, finalRevision.body);
      const runPass = await post(`/api/pilot/engine/studio/projects/${guidedId}/run`, learner, {
        revisionNo: 2,
        requestId: randomUUID(),
      });
      assert.equal(runPass.statusCode, 200, runPass.body);
      assert.equal(runPass.json().passed, true);
      assert.equal(
        (await get('/api/pilot/engine/courses/course-08', learner)).json().state,
        'IN_PROGRESS',
      );
      const visualCheck = await post(
        '/api/pilot/engine/courses/course-08/lessons/c08-l2',
        learner,
        {
          practice,
          answerIndex: candidate.courses[7].modules[1].lessons[0].check.correct,
          requestId: randomUUID(),
        },
      );
      assert.equal(visualCheck.statusCode, 200, visualCheck.body);
      assert.equal(
        (
          await post(`/api/pilot/engine/studio/projects/${guidedId}/revisions`, learner, {
            document: draft,
            requestId: randomUUID(),
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await post(`/api/pilot/engine/studio/projects/${guidedId}/run`, other, {
            revisionNo: 2,
            requestId: randomUUID(),
          })
        ).statusCode,
        404,
      );
      assert.equal(
        (await db.query('SELECT count(*) FROM learning.sandbox_runs WHERE passed')).rows[0].count,
        '1',
      );
      assert.equal(
        (await db.query('SELECT count(*) FROM learning.alignment_mappings')).rows[0].count,
        '0',
      );
      assert.equal(
        (await db.query('SELECT count(*) FROM learning.strategy_course_tags')).rows[0].count,
        '34',
      );
    } finally {
      await app.close();
      await db.end();
    }
  },
);

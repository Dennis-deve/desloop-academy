import type { Pool, PoolClient } from 'pg';
import { appendAudit, inTransaction, type Database } from '../db.js';
import {
  lessonsFor,
  scoreQuiz,
  scoreRubric,
  visibleCourse,
  type ReviewRubric,
} from '../catalog.js';
import { ApiError } from '../security.js';
import type { ProgressState } from './contracts.js';
import {
  ENGINE_POLICY,
  ENGINE_POLICY_VERSION,
  GUIDED_LESSON,
  type EngineCatalog,
} from './catalog.js';
import { approveReviewedCourse, EnginePolicyError, requireActiveCourse } from './policy.js';
import { PgApprovalRepository, transitionProgress } from './repository.js';

type Sql = Pool | PoolClient;
type Enrollment = {
  active_release_id: string;
  pinned_policy_version: string;
  status: string;
  version: string;
  content_sha256: string;
};
type ProgressRow = { course_id: string; state: ProgressState; sequence_no: number };
type ModuleRow = { module_id: string; state: ProgressState; ordinal: number };
type QuizRow = {
  id: string;
  course_id: string;
  score: number;
  critical_passed: boolean;
  answers: number[];
  request_id: string;
  created_at: Date;
};
type SubmissionRow = {
  id: string;
  course_id: string;
  iteration: number;
  status: string;
  submitted_at: Date;
  feedback: string | null;
};
export type V2LessonInput = { practice: string; answerIndex: number; requestId: string };
export type V2QuizInput = { answers: number[]; requestId: string };
export type V2ProjectInput = {
  artefact: string;
  reflection: string;
  safetyAttested: true;
  requestId: string;
};
export type V2ReviewInput = {
  decision: 'approved' | 'revision_requested';
  rubric: ReviewRubric;
  safetyApproved: boolean;
  feedback: string;
  requestId: string;
};

export class LearningEngine {
  constructor(
    private db: Database,
    private catalog: EngineCatalog,
    private releaseId: string,
  ) {}

  private async enrollment(sql: Sql, learnerId: string) {
    const found = await sql.query<Enrollment>(
      `SELECT e.active_release_id,e.pinned_policy_version,e.status,
       r.version,r.content_sha256 FROM learning.enrollments e
       JOIN learning.catalog_releases r ON r.id=e.active_release_id
       WHERE e.learner_id=$1`,
      [learnerId],
    );
    const e = found.rows[0];
    if (!e || e.status !== 'active')
      throw new ApiError(
        403,
        'ENGINE_NOT_ENROLLED',
        'Operator enrolment is required for the draft-2 pilot.',
      );
    if (
      e.active_release_id !== this.releaseId ||
      e.pinned_policy_version !== ENGINE_POLICY_VERSION ||
      e.version !== this.catalog.version ||
      e.content_sha256 !== this.catalog.hash
    )
      throw new ApiError(
        409,
        'RELEASE_CHANGED',
        'Your pinned release differs from the available internal draft.',
      );
    return e;
  }
  private async prefix(sql: Sql, learnerId: string) {
    const found = await sql.query<{ sequence_no: number; course_id: string }>(
      `SELECT sequence_no,course_id FROM learning.course_completions
       WHERE learner_id=$1 AND release_id=$2 AND policy_version=$3 ORDER BY sequence_no`,
      [learnerId, this.releaseId, ENGINE_POLICY_VERSION],
    );
    for (const [index, row] of found.rows.entries())
      if (row.sequence_no !== index + 1 || row.course_id !== this.catalog.courses[index]?.id)
        throw new ApiError(
          409,
          'PROGRESS_CORRUPT',
          'Completion history is not a contiguous sequence.',
        );
    return found.rows.length;
  }
  private async active(sql: Sql, learnerId: string, courseId: string) {
    await this.enrollment(sql, learnerId);
    const course = this.catalog.course(courseId);
    if (!course) throw new ApiError(404, 'COURSE_UNKNOWN', 'Course not found.');
    const prefix = await this.prefix(sql, learnerId);
    if (course.number !== prefix + 1)
      throw new ApiError(423, 'COURSE_LOCKED', 'Only the next required course is open.');
    requireActiveCourse(
      {
        id: course.id,
        sequenceNo: course.number,
        releaseId: this.releaseId,
        policyVersion: ENGINE_POLICY_VERSION,
      },
      prefix,
      this.releaseId,
      ENGINE_POLICY_VERSION,
    );
    const found = await sql.query<{ state: ProgressState }>(
      `SELECT state FROM learning.course_progress
       WHERE learner_id=$1 AND release_id=$2 AND course_id=$3`,
      [learnerId, this.releaseId, courseId],
    );
    if (!found.rows[0] || ['LOCKED', 'COMPLETED'].includes(found.rows[0].state))
      throw new ApiError(423, 'COURSE_LOCKED', 'The course is locked or already completed.');
    return { course, state: found.rows[0].state };
  }
  private async modules(sql: Sql, learnerId: string, courseId: string) {
    const found = await sql.query<ModuleRow>(
      `SELECT mp.module_id,mp.state,m.ordinal FROM learning.module_progress mp
       JOIN learning.modules m ON m.release_id=mp.release_id AND m.course_id=mp.course_id AND m.id=mp.module_id
       WHERE mp.learner_id=$1 AND mp.release_id=$2 AND mp.course_id=$3 ORDER BY m.ordinal`,
      [learnerId, this.releaseId, courseId],
    );
    if (found.rows.length !== 4)
      throw new ApiError(409, 'RELEASE_INVALID', 'The required modules are incomplete.');
    return found.rows;
  }
  private async doneLessons(sql: Sql, learnerId: string, courseId: string) {
    const found = await sql.query<{ lesson_id: string; guided_run_id: string | null }>(
      `SELECT lesson_id,guided_run_id FROM learning.lesson_passes
       WHERE learner_id=$1 AND release_id=$2 AND course_id=$3`,
      [learnerId, this.releaseId, courseId],
    );
    return found.rows;
  }
  private async quizFor(sql: Sql, learnerId: string, courseId: string) {
    const found = await sql.query<QuizRow>(
      `SELECT id,course_id,score,critical_passed,answers,request_id,created_at
       FROM learning.quiz_attempts WHERE learner_id=$1 AND release_id=$2 AND course_id=$3 ORDER BY id DESC LIMIT 1`,
      [learnerId, this.releaseId, courseId],
    );
    return found.rows[0] ?? null;
  }
  private async submissionFor(sql: Sql, learnerId: string, courseId: string) {
    const found = await sql.query<SubmissionRow>(
      `SELECT s.id,s.course_id,s.iteration,s.status,s.submitted_at,d.feedback
       FROM learning.project_submissions s
       LEFT JOIN learning.review_decisions d ON d.submission_id=s.id
       WHERE s.learner_id=$1 AND s.release_id=$2 AND s.course_id=$3
       ORDER BY s.iteration DESC LIMIT 1`,
      [learnerId, this.releaseId, courseId],
    );
    return found.rows[0] ?? null;
  }
  private async startIfNeeded(
    client: PoolClient,
    learnerId: string,
    courseId: string,
    moduleId: string,
    actorId: string,
  ) {
    const rows = await client.query<{ state: ProgressState }>(
      'SELECT state FROM learning.course_progress WHERE learner_id=$1 AND release_id=$2 AND course_id=$3',
      [learnerId, this.releaseId, courseId],
    );
    const courseState = rows.rows[0]?.state;
    if (courseState === 'AVAILABLE' || courseState === 'FAILED_REMEDIATION')
      await transitionProgress(
        client,
        'COURSE',
        learnerId,
        this.releaseId,
        courseId,
        null,
        courseState === 'AVAILABLE' ? 'START' : 'RETRY',
        actorId,
        'learner-resumed-practice',
      );
    else if (courseState !== 'IN_PROGRESS')
      throw new ApiError(409, 'REVIEW_PENDING', 'The course is not open for practice.');
    const modules = await client.query<{ state: ProgressState }>(
      'SELECT state FROM learning.module_progress WHERE learner_id=$1 AND release_id=$2 AND course_id=$3 AND module_id=$4',
      [learnerId, this.releaseId, courseId, moduleId],
    );
    const moduleState = modules.rows[0]?.state;
    if (moduleState === 'AVAILABLE' || moduleState === 'FAILED_REMEDIATION')
      await transitionProgress(
        client,
        'MODULE',
        learnerId,
        this.releaseId,
        courseId,
        moduleId,
        moduleState === 'AVAILABLE' ? 'START' : 'RETRY',
        actorId,
        'learner-resumed-practice',
      );
    else if (moduleState !== 'IN_PROGRESS')
      throw new ApiError(423, 'MODULE_LOCKED', 'Complete the previous module first.');
  }

  async requirePlaygroundAccess(sql: Sql, learnerId: string) {
    await this.enrollment(sql, learnerId);
  }
  async requireGuidedAccess(sql: Sql, learnerId: string, courseId: string, lessonId: string) {
    if (courseId !== GUIDED_LESSON.courseId || lessonId !== GUIDED_LESSON.lessonId)
      throw new ApiError(
        404,
        'GUIDED_LESSON_UNKNOWN',
        'This guided tool is not available for that lesson.',
      );
    await this.active(sql, learnerId, courseId);
    const done = await this.doneLessons(sql, learnerId, courseId);
    if (!done.some((row) => row.lesson_id === 'c08-l1'))
      throw new ApiError(
        423,
        'LESSON_LOCKED',
        'Finish the first lesson before the guided activity.',
      );
    if (done.some((row) => row.lesson_id === lessonId))
      throw new ApiError(
        409,
        'LESSON_COMPLETED',
        'Guided evidence is frozen after this lesson passes. Use free practice to keep exploring.',
      );
    const module = (await this.modules(sql, learnerId, courseId))[1];
    if (['LOCKED', 'COMPLETED', 'SUBMITTED_FOR_REVIEW', 'NEEDS_REVISION'].includes(module.state))
      throw new ApiError(423, 'MODULE_LOCKED', 'This module cannot accept new guided work.');
    return { courseId, moduleId: module.module_id, lessonId };
  }
  async onGuidedResult(client: PoolClient, learnerId: string, passed: boolean) {
    await this.startIfNeeded(
      client,
      learnerId,
      GUIDED_LESSON.courseId,
      GUIDED_LESSON.moduleId,
      learnerId,
    );
    if (!passed) {
      await transitionProgress(
        client,
        'MODULE',
        learnerId,
        this.releaseId,
        GUIDED_LESSON.courseId,
        GUIDED_LESSON.moduleId,
        'AUTO_FAIL',
        learnerId,
        'guided-criteria-remediation',
      );
      await transitionProgress(
        client,
        'COURSE',
        learnerId,
        this.releaseId,
        GUIDED_LESSON.courseId,
        null,
        'AUTO_FAIL',
        learnerId,
        'guided-criteria-remediation',
      );
    }
  }

  /** Only the CLI may call this after an operator reviews the adult's invitation. */
  async enroll(learnerId: string, operator: string) {
    return inTransaction(this.db, async (client) => {
      const account = await client.query<{ id: string }>(
        "SELECT id FROM pilot.users WHERE id=$1 AND role='learner' AND status='active' FOR UPDATE",
        [learnerId],
      );
      if (!account.rows[0])
        throw new ApiError(403, 'LEARNER_REQUIRED', 'An active adult-pilot learner is required.');
      const current = await client.query<{
        active_release_id: string;
        pinned_policy_version: string;
      }>(
        'SELECT active_release_id,pinned_policy_version FROM learning.enrollments WHERE learner_id=$1',
        [learnerId],
      );
      if (current.rows[0]) {
        if (
          current.rows[0].active_release_id !== this.releaseId ||
          current.rows[0].pinned_policy_version !== ENGINE_POLICY_VERSION
        )
          throw new ApiError(
            409,
            'EXPLICIT_MIGRATION_REQUIRED',
            'Changing a pinned release needs a separately audited migration.',
          );
        return { repeated: true, releaseVersion: this.catalog.version };
      }
      await client.query(
        `INSERT INTO learning.enrollments(learner_id,active_release_id,pinned_policy_version,assigned_by)
         VALUES($1,$2,$3,$4)`,
        [learnerId, this.releaseId, ENGINE_POLICY_VERSION, operator],
      );
      const courses = await client.query<{ course_id: string; sequence_no: number }>(
        `SELECT cc.course_id,c.sequence_no FROM learning.course_content cc
         JOIN learning.courses c ON c.id=cc.course_id
         WHERE cc.release_id=$1 ORDER BY c.sequence_no`,
        [this.releaseId],
      );
      if (courses.rows.length !== 44)
        throw new ApiError(409, 'RELEASE_INVALID', 'The release is incomplete.');
      for (const row of courses.rows) {
        await client.query(
          `INSERT INTO learning.course_progress(learner_id,release_id,course_id,policy_version)
           VALUES($1,$2,$3,$4)`,
          [learnerId, this.releaseId, row.course_id, ENGINE_POLICY_VERSION],
        );
        const modules = await client.query<{ id: string }>(
          'SELECT id FROM learning.modules WHERE release_id=$1 AND course_id=$2 ORDER BY ordinal',
          [this.releaseId, row.course_id],
        );
        if (modules.rows.length !== 4)
          throw new ApiError(409, 'RELEASE_INVALID', 'A required module is missing.');
        for (const mod of modules.rows)
          await client.query(
            `INSERT INTO learning.module_progress(learner_id,release_id,course_id,module_id)
             VALUES($1,$2,$3,$4)`,
            [learnerId, this.releaseId, row.course_id, mod.id],
          );
      }
      await transitionProgress(
        client,
        'COURSE',
        learnerId,
        this.releaseId,
        courses.rows[0].course_id,
        null,
        'UNLOCK',
        null,
        'operator-started-draft-sequence',
      );
      const first = await client.query<{ id: string }>(
        'SELECT id FROM learning.modules WHERE release_id=$1 AND course_id=$2 AND ordinal=1',
        [this.releaseId, courses.rows[0].course_id],
      );
      await transitionProgress(
        client,
        'MODULE',
        learnerId,
        this.releaseId,
        courses.rows[0].course_id,
        first.rows[0].id,
        'UNLOCK',
        null,
        'operator-started-draft-sequence',
      );
      await appendAudit(client, null, 'learning.enrollment.created', learnerId, {
        operator,
        releaseId: this.releaseId,
        policyVersion: ENGINE_POLICY_VERSION,
        pilotCompletionsNotImported: true,
      });
      return { repeated: false, releaseVersion: this.catalog.version };
    });
  }

  async pathway(learnerId: string) {
    await this.enrollment(this.db, learnerId);
    const prefix = await this.prefix(this.db, learnerId);
    const found = await this.db.query<ProgressRow>(
      `SELECT cp.course_id,cp.state,c.sequence_no FROM learning.course_progress cp
       JOIN learning.courses c ON c.id=cp.course_id
       WHERE cp.learner_id=$1 AND cp.release_id=$2 ORDER BY c.sequence_no`,
      [learnerId, this.releaseId],
    );
    if (found.rows.length !== 44)
      throw new ApiError(409, 'PROGRESS_MISSING', 'Pathway progress is incomplete.');
    const current = found.rows[prefix] ?? null;
    if (
      found.rows.some(
        (row, i) =>
          (i < prefix && row.state !== 'COMPLETED') ||
          (i > prefix && row.state !== 'LOCKED') ||
          (i === prefix && ['LOCKED', 'COMPLETED'].includes(row.state)),
      )
    )
      throw new ApiError(
        409,
        'PROGRESS_CORRUPT',
        'Stored course states do not match completed courses.',
      );
    return {
      mode: 'adult-draft-2' as const,
      contentVersion: this.catalog.version,
      policyVersion: ENGINE_POLICY_VERSION,
      completedCount: prefix,
      currentCourseId: current?.course_id ?? null,
      courses: found.rows.map((row) => ({
        id: row.course_id,
        number: row.sequence_no,
        title: this.catalog.course(row.course_id)?.title ?? '',
        stage: this.catalog.course(row.course_id)?.stage ?? '',
        state: row.state,
        strategyHints: (this.catalog.strategyTags.get(row.course_id) ?? []).map((tag) => ({
          code: tag.code,
          kind: tag.kind,
          status: 'strategy-proposed' as const,
        })),
      })),
    };
  }

  async courseDetail(learnerId: string, courseId: string) {
    await this.enrollment(this.db, learnerId);
    const course = this.catalog.course(courseId);
    if (!course) throw new ApiError(404, 'COURSE_UNKNOWN', 'Course not found.');
    const prefix = await this.prefix(this.db, learnerId);
    if (course.number > prefix + 1)
      throw new ApiError(423, 'COURSE_LOCKED', 'Complete earlier courses first.');
    const state = await this.db.query<{ state: ProgressState }>(
      'SELECT state FROM learning.course_progress WHERE learner_id=$1 AND release_id=$2 AND course_id=$3',
      [learnerId, this.releaseId, courseId],
    );
    const [mods, lessons, quiz, submission] = await Promise.all([
      this.modules(this.db, learnerId, courseId),
      this.doneLessons(this.db, learnerId, courseId),
      this.quizFor(this.db, learnerId, courseId),
      this.submissionFor(this.db, learnerId, courseId),
    ]);
    return {
      course: visibleCourse(course),
      state: state.rows[0]?.state ?? 'LOCKED',
      moduleStates: mods.map((row) => ({ id: row.module_id, state: row.state })),
      completedLessons: lessons.map((row) => row.lesson_id),
      guidedLessonId: courseId === GUIDED_LESSON.courseId ? GUIDED_LESSON.lessonId : null,
      guidedPassed: lessons.some(
        (row) => row.lesson_id === GUIDED_LESSON.lessonId && row.guided_run_id,
      ),
      strategyHints: (this.catalog.strategyTags.get(courseId) ?? []).map((tag) => ({
        code: tag.code,
        kind: tag.kind,
        status: tag.status,
      })),
      quiz: quiz
        ? { score: quiz.score, criticalPassed: quiz.critical_passed, attemptedAt: quiz.created_at }
        : null,
      project: submission
        ? {
            id: submission.id,
            status: submission.status,
            iteration: submission.iteration,
            submittedAt: submission.submitted_at,
            feedback: submission.feedback,
          }
        : null,
    };
  }

  async lesson(learnerId: string, courseId: string, lessonId: string, input: V2LessonInput) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const existing = await client.query<{
        course_id: string;
        lesson_id: string;
        correct: boolean;
      }>(
        'SELECT course_id,lesson_id,correct FROM learning.lesson_attempts WHERE learner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].course_id !== courseId || existing.rows[0].lesson_id !== lessonId)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to another lesson.');
        return { completed: existing.rows[0].correct, repeated: true, explanation: null };
      }
      const { course } = await this.active(client, learnerId, courseId);
      const all = lessonsFor(course);
      const index = all.findIndex((l) => l.id === lessonId);
      if (index < 0) throw new ApiError(404, 'LESSON_UNKNOWN', 'No such lesson in this course.');
      if ((await this.submissionFor(client, learnerId, courseId))?.status === 'submitted')
        throw new ApiError(409, 'REVIEW_PENDING', 'Wait for the assigned reviewer.');
      const done = await this.doneLessons(client, learnerId, courseId);
      if (done.some((row) => row.lesson_id === lessonId))
        return { completed: true, repeated: true, explanation: null };
      if (index > 0 && !done.some((row) => row.lesson_id === all[index - 1].id))
        throw new ApiError(423, 'LESSON_LOCKED', 'Complete the previous lesson first.');
      const module = course.modules[index];
      if (!module || module.lessons[0]?.id !== lessonId)
        throw new ApiError(409, 'RELEASE_INVALID', 'Module/lesson order is invalid.');
      if (
        input.practice.trim().length < ENGINE_POLICY.practiceMinimum ||
        input.practice.length > 5000
      )
        throw new ApiError(
          422,
          'PRACTICE_SHORT',
          'Describe at least 15 characters of safe practice.',
        );
      const check = all[index].check;
      if (
        !Number.isInteger(input.answerIndex) ||
        input.answerIndex < 0 ||
        input.answerIndex >= check.options.length
      )
        throw new ApiError(422, 'ANSWER_INVALID', 'Choose one displayed answer.');
      let guidedRunId: string | null = null;
      if (lessonId === GUIDED_LESSON.lessonId) {
        const run = await client.query<{ id: string }>(
          `SELECT r.id FROM learning.sandbox_runs r JOIN learning.sandbox_projects p ON p.id=r.project_id
           WHERE p.owner_id=$1 AND p.scope='GUIDED' AND p.release_id=$2 AND p.course_id=$3
             AND p.module_id=$4 AND p.lesson_id=$5 AND r.passed
             AND r.revision_no=(SELECT max(v.revision_no) FROM learning.sandbox_revisions v WHERE v.project_id=p.id)
           ORDER BY r.created_at DESC LIMIT 1`,
          [learnerId, this.releaseId, courseId, module.id, lessonId],
        );
        if (!run.rows[0])
          throw new ApiError(
            423,
            'SANDBOX_REQUIRED',
            'Save and pass the guided visual activity before this lesson check.',
          );
        guidedRunId = run.rows[0].id;
      }
      await this.startIfNeeded(client, learnerId, courseId, module.id, learnerId);
      const correct = input.answerIndex === check.correct;
      await client.query(
        `INSERT INTO learning.lesson_attempts
         (learner_id,release_id,course_id,module_id,lesson_id,answer_index,correct,request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          learnerId,
          this.releaseId,
          courseId,
          module.id,
          lessonId,
          input.answerIndex,
          correct,
          input.requestId,
        ],
      );
      if (correct) {
        await client.query(
          `INSERT INTO learning.lesson_passes
           (learner_id,release_id,course_id,module_id,lesson_id,practice,answer_index,guided_run_id,request_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            learnerId,
            this.releaseId,
            courseId,
            module.id,
            lessonId,
            input.practice.trim(),
            input.answerIndex,
            guidedRunId,
            input.requestId,
          ],
        );
        if (index < all.length - 1) {
          await transitionProgress(
            client,
            'MODULE',
            learnerId,
            this.releaseId,
            courseId,
            module.id,
            'AUTO_COMPLETE_MODULE',
            learnerId,
            'required-lesson-passed',
          );
          await transitionProgress(
            client,
            'MODULE',
            learnerId,
            this.releaseId,
            courseId,
            course.modules[index + 1].id,
            'UNLOCK',
            learnerId,
            'previous-module-passed',
          );
        }
      } else {
        await transitionProgress(
          client,
          'MODULE',
          learnerId,
          this.releaseId,
          courseId,
          module.id,
          'AUTO_FAIL',
          learnerId,
          'lesson-check-failed',
        );
        await transitionProgress(
          client,
          'COURSE',
          learnerId,
          this.releaseId,
          courseId,
          null,
          'AUTO_FAIL',
          learnerId,
          'lesson-check-failed',
        );
      }
      await appendAudit(client, learnerId, 'learning.lesson.attempted', lessonId, {
        courseId,
        releaseId: this.releaseId,
        correct,
        usedGuidedRun: Boolean(guidedRunId),
      });
      return { completed: correct, repeated: false, explanation: check.explanation };
    });
  }

  async quiz(learnerId: string, courseId: string, input: V2QuizInput) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const existing = await client.query<QuizRow>(
        'SELECT id,course_id,score,critical_passed,answers,request_id,created_at FROM learning.quiz_attempts WHERE learner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].course_id !== courseId)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to another quiz.');
        const row = existing.rows[0];
        return {
          score: row.score,
          criticalPassed: row.critical_passed,
          passed: row.score >= ENGINE_POLICY.quizMinimum && row.critical_passed,
          missed: [],
          repeated: true,
        };
      }
      const { course } = await this.active(client, learnerId, courseId);
      if ((await this.doneLessons(client, learnerId, courseId)).length !== 4)
        throw new ApiError(
          423,
          'PRACTICE_INCOMPLETE',
          'Complete all four required lesson checks first.',
        );
      if ((await this.submissionFor(client, learnerId, courseId))?.status === 'submitted')
        throw new ApiError(409, 'REVIEW_PENDING', 'Wait for the assigned reviewer.');
      const mod = course.modules[3];
      await this.startIfNeeded(client, learnerId, courseId, mod.id, learnerId);
      let grade: ReturnType<typeof scoreQuiz>;
      try {
        grade = scoreQuiz(course, input.answers);
      } catch {
        throw new ApiError(422, 'ANSWERS_INVALID', 'Answer each of the five items.');
      }
      await client.query(
        `INSERT INTO learning.quiz_attempts
         (learner_id,release_id,course_id,answers,score,critical_passed,request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          learnerId,
          this.releaseId,
          courseId,
          JSON.stringify(input.answers),
          grade.score,
          grade.criticalPassed,
          input.requestId,
        ],
      );
      const passed = grade.score >= ENGINE_POLICY.quizMinimum && grade.criticalPassed;
      if (!passed) {
        await transitionProgress(
          client,
          'MODULE',
          learnerId,
          this.releaseId,
          courseId,
          mod.id,
          'AUTO_FAIL',
          learnerId,
          'quiz-or-safety-remediation',
        );
        await transitionProgress(
          client,
          'COURSE',
          learnerId,
          this.releaseId,
          courseId,
          null,
          'AUTO_FAIL',
          learnerId,
          'quiz-or-safety-remediation',
        );
      }
      await appendAudit(client, learnerId, 'learning.quiz.attempted', courseId, {
        releaseId: this.releaseId,
        score: grade.score,
        criticalPassed: grade.criticalPassed,
      });
      return { ...grade, passed, repeated: false };
    });
  }

  async submit(learnerId: string, courseId: string, input: V2ProjectInput) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const replay = await client.query<{ id: string; course_id: string; status: string }>(
        'SELECT id,course_id,status FROM learning.project_submissions WHERE learner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (replay.rows[0]) {
        if (replay.rows[0].course_id !== courseId)
          throw new ApiError(409, 'REQUEST_REUSED', 'Request ID belongs to a different project.');
        return { submissionId: replay.rows[0].id, status: replay.rows[0].status, repeated: true };
      }
      const { course, state } = await this.active(client, learnerId, courseId);
      if ((await this.doneLessons(client, learnerId, courseId)).length !== 4)
        throw new ApiError(423, 'PRACTICE_INCOMPLETE', 'Complete all required practice.');
      const quiz = await this.quizFor(client, learnerId, courseId);
      if (!quiz || quiz.score < ENGINE_POLICY.quizMinimum || !quiz.critical_passed)
        throw new ApiError(423, 'QUIZ_INCOMPLETE', 'Pass the quiz and all safety checks first.');
      const previous = await this.submissionFor(client, learnerId, courseId);
      if (previous?.status === 'submitted')
        throw new ApiError(409, 'REVIEW_PENDING', 'A project is awaiting review.');
      if (previous?.status === 'approved')
        throw new ApiError(409, 'ALREADY_COMPLETED', 'This course already passed.');
      if (
        !input.safetyAttested ||
        input.artefact.trim().length < ENGINE_POLICY.evidenceMinimum ||
        input.artefact.length > 5000 ||
        input.reflection.trim().length < ENGINE_POLICY.reflectionMinimum ||
        input.reflection.length > 5000
      )
        throw new ApiError(
          422,
          'EVIDENCE_INCOMPLETE',
          'Supply safe evidence and reflection, with the privacy check.',
        );
      if (state === 'NEEDS_REVISION') {
        await transitionProgress(
          client,
          'COURSE',
          learnerId,
          this.releaseId,
          courseId,
          null,
          'RETRY',
          learnerId,
          'revised-project-submitted',
        );
        await transitionProgress(
          client,
          'MODULE',
          learnerId,
          this.releaseId,
          courseId,
          course.modules[3].id,
          'RETRY',
          learnerId,
          'revised-project-submitted',
        );
      } else if (state !== 'IN_PROGRESS')
        throw new ApiError(409, 'COURSE_NOT_READY', 'Practice is not ready for review.');
      const saved = await client.query<{ id: string }>(
        `INSERT INTO learning.project_submissions
         (learner_id,release_id,course_id,iteration,artefact,reflection,safety_attested,request_id)
         VALUES($1,$2,$3,$4,$5,$6,true,$7) RETURNING id`,
        [
          learnerId,
          this.releaseId,
          courseId,
          (previous?.iteration ?? 0) + 1,
          input.artefact.trim(),
          input.reflection.trim(),
          input.requestId,
        ],
      );
      await transitionProgress(
        client,
        'MODULE',
        learnerId,
        this.releaseId,
        courseId,
        course.modules[3].id,
        'SUBMIT_REVIEW',
        learnerId,
        'required-project-submitted',
      );
      await transitionProgress(
        client,
        'COURSE',
        learnerId,
        this.releaseId,
        courseId,
        null,
        'SUBMIT_REVIEW',
        learnerId,
        'required-project-submitted',
      );
      await appendAudit(client, learnerId, 'learning.project.submitted', saved.rows[0].id, {
        courseId,
        releaseId: this.releaseId,
      });
      return { submissionId: saved.rows[0].id, status: 'submitted' as const, repeated: false };
    });
  }

  async reviewQueue(reviewerId: string) {
    const found = await this.db.query<{
      id: string;
      course_id: string;
      learner_name: string;
      artefact: string;
      reflection: string;
      iteration: number;
      submitted_at: Date;
    }>(
      `SELECT s.id,s.course_id,u.display_name AS learner_name,s.artefact,s.reflection,
       s.iteration,s.submitted_at FROM learning.review_assignments a
       JOIN learning.project_submissions s ON s.id=a.submission_id
       JOIN pilot.users u ON u.id=s.learner_id
       WHERE a.reviewer_id=$1 AND s.release_id=$2 AND s.status='submitted'
       ORDER BY a.assigned_at`,
      [reviewerId, this.releaseId],
    );
    return found.rows.map((row) => ({
      ...row,
      courseTitle: this.catalog.course(row.course_id)?.title ?? '',
      rubricDimensions:
        row.course_id === 'course-44'
          ? ['scope', 'project', 'design', 'technical', 'testing', 'safety', 'presentation']
          : ['project', 'practice', 'reflection', 'safety'],
    }));
  }

  async review(reviewerId: string, submissionId: string, input: V2ReviewInput) {
    return inTransaction(this.db, async (client) => {
      const candidate = await client.query<{ learner_id: string }>(
        `SELECT s.learner_id FROM learning.review_assignments a
         JOIN learning.project_submissions s ON s.id=a.submission_id
         WHERE a.submission_id=$1 AND a.reviewer_id=$2`,
        [submissionId, reviewerId],
      );
      if (!candidate.rows[0])
        throw new ApiError(404, 'REVIEW_UNKNOWN', 'No assigned project found.');
      const learnerId = candidate.rows[0].learner_id;
      if (learnerId === reviewerId)
        throw new ApiError(403, 'SELF_REVIEW', 'Learners cannot review themselves.');
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const reused = await client.query<{
        submission_id: string;
        decision: string;
        project_score: number;
        overall_score: number;
      }>(
        'SELECT submission_id,decision,project_score,overall_score FROM learning.review_decisions WHERE reviewer_id=$1 AND request_id=$2',
        [reviewerId, input.requestId],
      );
      if (reused.rows[0]) {
        if (reused.rows[0].submission_id !== submissionId)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to another review.');
        const completion = await client.query<{ course_id: string; sequence_no: number }>(
          'SELECT course_id,sequence_no FROM learning.course_completions WHERE submission_id=$1',
          [submissionId],
        );
        return {
          repeated: true,
          completed: !!completion.rows[0],
          decision: reused.rows[0].decision,
          projectScore: reused.rows[0].project_score,
          overallScore: reused.rows[0].overall_score,
          nextCourseId: completion.rows[0]
            ? (this.catalog.courses[completion.rows[0].sequence_no]?.id ?? null)
            : null,
        };
      }
      const found = await client.query<{
        id: string;
        learner_id: string;
        release_id: string;
        course_id: string;
        status: string;
      }>(
        `SELECT s.id,s.learner_id,s.release_id,s.course_id,s.status
         FROM learning.project_submissions s JOIN learning.review_assignments a ON a.submission_id=s.id
         WHERE s.id=$1 AND a.reviewer_id=$2 FOR UPDATE OF s`,
        [submissionId, reviewerId],
      );
      const sub = found.rows[0];
      if (!sub || sub.status !== 'submitted' || sub.release_id !== this.releaseId)
        throw new ApiError(409, 'REVIEW_ALREADY_DONE', 'This project is not waiting for review.');
      const { course, state } = await this.active(client, learnerId, sub.course_id);
      if (state !== 'SUBMITTED_FOR_REVIEW')
        throw new ApiError(409, 'REVIEW_NOT_READY', 'The course is not awaiting review.');
      const quiz = await this.quizFor(client, learnerId, course.id);
      if (!quiz || quiz.score < ENGINE_POLICY.quizMinimum || !quiz.critical_passed)
        throw new ApiError(409, 'QUIZ_INCOMPLETE', 'Quiz and safety checks are not passed.');
      if (input.feedback.trim().length < 10 || input.feedback.length > 3000)
        throw new ApiError(
          422,
          'FEEDBACK_SHORT',
          'Provide at least ten characters of helpful feedback.',
        );
      let score: ReturnType<typeof scoreRubric>;
      try {
        score = scoreRubric(course, quiz.score, input.rubric);
      } catch {
        throw new ApiError(422, 'RUBRIC_INVALID', 'Provide all rubric dimensions (0–100).');
      }
      if (
        input.decision === 'approved' &&
        (!input.safetyApproved ||
          score.project < ENGINE_POLICY.projectMinimum ||
          score.overall < ENGINE_POLICY.projectMinimum ||
          score.safety < ENGINE_POLICY.projectMinimum)
      )
        throw new ApiError(
          422,
          'GATE_FAILED',
          'A pass requires all safety, project and overall scores at 70 or above. Request revision instead.',
        );
      await client.query(
        `INSERT INTO learning.review_decisions
         (submission_id,reviewer_id,decision,rubric,quiz_score,project_score,overall_score,safety_score,safety_approved,feedback,request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          submissionId,
          reviewerId,
          input.decision,
          JSON.stringify(input.rubric),
          quiz.score,
          score.project,
          score.overall,
          score.safety,
          input.safetyApproved,
          input.feedback.trim(),
          input.requestId,
        ],
      );
      await client.query('UPDATE learning.project_submissions SET status=$2 WHERE id=$1', [
        submissionId,
        input.decision,
      ]);
      let nextCourseId: string | null = null;
      if (input.decision === 'approved') {
        try {
          const result = await approveReviewedCourse(
            new PgApprovalRepository(client, this.catalog),
            {
              learnerId,
              courseId: course.id,
              reviewerId,
              decisionId: submissionId,
              requestId: input.requestId,
            },
          );
          nextCourseId = result.nextCourseId;
        } catch (error) {
          if (error instanceof EnginePolicyError)
            throw new ApiError(409, error.code, error.message);
          throw error;
        }
      } else {
        await transitionProgress(
          client,
          'MODULE',
          learnerId,
          this.releaseId,
          course.id,
          course.modules[3].id,
          'REQUEST_REVISION',
          reviewerId,
          'reviewer-requested-revision',
        );
        await transitionProgress(
          client,
          'COURSE',
          learnerId,
          this.releaseId,
          course.id,
          null,
          'REQUEST_REVISION',
          reviewerId,
          'reviewer-requested-revision',
        );
        await appendAudit(client, reviewerId, 'learning.review.revision', submissionId, {
          learnerId,
          courseId: course.id,
          releaseId: this.releaseId,
        });
      }
      return {
        repeated: false,
        completed: input.decision === 'approved',
        decision: input.decision,
        projectScore: score.project,
        overallScore: score.overall,
        nextCourseId,
      };
    });
  }
}

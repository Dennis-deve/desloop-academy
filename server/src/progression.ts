import type { Pool, PoolClient } from 'pg';
import { appendAudit, inTransaction, type Database } from './db.js';
import {
  completedPrefix,
  lessonsFor,
  POLICY,
  POLICY_VERSION,
  scoreQuiz,
  scoreRubric,
  visibleCourse,
  type PilotCatalog,
  type PilotCourse,
  type ReviewRubric,
} from './catalog.js';
import { ApiError } from './security.js';

type Sql = Pool | PoolClient;
type Completion = { course_id: string; version: string; policy_version: string };
type QuizRow = {
  id: string;
  course_id: string;
  score: number;
  critical_passed: boolean;
  answers: number[];
  created_at: Date;
};
type SubmissionRow = {
  id: string;
  learner_id: string;
  course_id: string;
  version: string;
  iteration: number;
  artefact: string;
  reflection: string;
  status: 'submitted' | 'revision_requested' | 'approved';
  submitted_at: Date;
  feedback?: string;
  reviewer_id?: string;
};

export interface LessonInput {
  practice: string;
  answerIndex: number;
  responseMode: 'typed' | 'dictated-or-described';
  requestId: string;
}
export interface QuizInput {
  answers: number[];
  requestId: string;
}
export interface ProjectInput {
  artefact: string;
  reflection: string;
  responseMode: 'typed' | 'dictated-or-described';
  safetyAttested: true;
  requestId: string;
}
export interface ReviewInput {
  decision: 'approved' | 'revision_requested';
  rubric: ReviewRubric;
  safetyApproved: boolean;
  feedback: string;
}

async function prefixFor(sql: Sql, catalog: PilotCatalog, learnerId: string) {
  const result = await sql.query<Completion>(
    'SELECT course_id, version, policy_version FROM pilot.course_completions WHERE learner_id=$1',
    [learnerId],
  );
  return completedPrefix(catalog, result.rows);
}
async function quizFor(sql: Sql, learnerId: string, course: PilotCourse) {
  const found = await sql.query<QuizRow>(
    `SELECT id, course_id, score, critical_passed, answers, created_at
    FROM pilot.quiz_attempts WHERE learner_id=$1 AND course_id=$2 AND version=$3 ORDER BY id DESC LIMIT 1`,
    [learnerId, course.id, course.version],
  );
  return found.rows[0] ?? null;
}
async function submissionFor(sql: Sql, learnerId: string, course: PilotCourse) {
  const found = await sql.query<SubmissionRow>(
    `SELECT s.id,s.learner_id,s.course_id,s.version,s.iteration,s.artefact,s.reflection,s.status,s.submitted_at,
    r.feedback FROM pilot.project_submissions s LEFT JOIN pilot.review_decisions r ON r.submission_id=s.id
    WHERE s.learner_id=$1 AND s.course_id=$2 AND s.version=$3 ORDER BY s.iteration DESC LIMIT 1`,
    [learnerId, course.id, course.version],
  );
  return found.rows[0] ?? null;
}
async function completedLessons(sql: Sql, learnerId: string, course: PilotCourse) {
  const found = await sql.query<{ lesson_id: string }>(
    'SELECT lesson_id FROM pilot.lesson_completions WHERE learner_id=$1 AND course_id=$2 AND version=$3',
    [learnerId, course.id, course.version],
  );
  return found.rows.map((row) => row.lesson_id);
}
function requireActive(catalog: PilotCatalog, courseId: string, prefix: number) {
  const course = catalog.course(courseId);
  if (!course) throw new ApiError(404, 'COURSE_UNKNOWN', 'Course not found.');
  if (course.number !== prefix + 1)
    throw new ApiError(423, 'COURSE_LOCKED', 'Only the next required course can be attempted.');
  return course;
}
function currentState(
  prefix: number,
  course: PilotCourse,
  quiz: QuizRow | null,
  submission: SubmissionRow | null,
) {
  if (course.number <= prefix) return 'completed' as const;
  if (course.number > prefix + 1) return 'locked' as const;
  if (submission?.status === 'submitted') return 'review' as const;
  if (
    submission?.status === 'revision_requested' ||
    (quiz && (quiz.score < POLICY.quizMinimum || !quiz.critical_passed))
  )
    return 'revision' as const;
  return 'current' as const;
}

export class PilotProgression {
  constructor(
    private db: Database,
    private catalog: PilotCatalog,
  ) {}

  async pathway(learnerId: string) {
    const prefix = await prefixFor(this.db, this.catalog, learnerId);
    const active = this.catalog.courses[prefix] ?? null;
    const [quiz, submission] = active
      ? await Promise.all([
          quizFor(this.db, learnerId, active),
          submissionFor(this.db, learnerId, active),
        ])
      : [null, null];
    return {
      mode: 'adult-internal-draft' as const,
      contentVersion: this.catalog.version,
      policyVersion: POLICY_VERSION,
      completedCount: prefix,
      currentCourseId: active?.id ?? null,
      courses: this.catalog.courses.map((course) => ({
        id: course.id,
        number: course.number,
        title: course.title,
        stage: course.stage,
        version: course.version,
        state: currentState(
          prefix,
          course,
          course.id === active?.id ? quiz : null,
          course.id === active?.id ? submission : null,
        ),
      })),
    };
  }

  async courseDetail(learnerId: string, courseId: string) {
    const course = this.catalog.course(courseId);
    if (!course) throw new ApiError(404, 'COURSE_UNKNOWN', 'Course not found.');
    const prefix = await prefixFor(this.db, this.catalog, learnerId);
    if (course.number > prefix + 1)
      throw new ApiError(423, 'COURSE_LOCKED', 'Complete and pass earlier courses first.');
    const [lessons, quiz, submission] = await Promise.all([
      completedLessons(this.db, learnerId, course),
      quizFor(this.db, learnerId, course),
      submissionFor(this.db, learnerId, course),
    ]);
    return {
      course: visibleCourse(course),
      state: currentState(prefix, course, quiz, submission),
      completedLessons: lessons,
      quiz: quiz
        ? { score: quiz.score, criticalPassed: quiz.critical_passed, attemptedAt: quiz.created_at }
        : null,
      project: submission
        ? {
            id: submission.id,
            status: submission.status,
            iteration: submission.iteration,
            submittedAt: submission.submitted_at,
            feedback: submission.feedback ?? null,
          }
        : null,
    };
  }

  async lesson(learnerId: string, courseId: string, lessonId: string, input: LessonInput) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const existing = await client.query<{
        id: string;
        correct: boolean;
        course_id: string;
        lesson_id: string;
      }>(
        'SELECT id,correct,course_id,lesson_id FROM pilot.lesson_attempts WHERE learner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].course_id !== courseId || existing.rows[0].lesson_id !== lessonId)
          throw new ApiError(
            409,
            'REQUEST_REUSED',
            'This request ID already belongs to a different lesson.',
          );
        return { completed: existing.rows[0].correct, repeated: true, explanation: null };
      }
      const course = requireActive(
        this.catalog,
        courseId,
        await prefixFor(client, this.catalog, learnerId),
      );
      const lessons = lessonsFor(course);
      const index = lessons.findIndex((item) => item.id === lessonId);
      if (index < 0) throw new ApiError(404, 'LESSON_UNKNOWN', 'Lesson not found in this course.');
      if ((await submissionFor(client, learnerId, course))?.status === 'submitted')
        throw new ApiError(409, 'AWAITING_REVIEW', 'Wait for your assigned reviewer.');
      const done = await completedLessons(client, learnerId, course);
      if (done.includes(lessonId)) return { completed: true, repeated: true, explanation: null };
      if (index > 0 && !done.includes(lessons[index - 1].id))
        throw new ApiError(423, 'LESSON_LOCKED', 'Complete the previous lesson first.');
      if (input.practice.trim().length < POLICY.practiceMinimum)
        throw new ApiError(
          422,
          'PRACTICE_SHORT',
          'Describe at least 15 characters of your practice.',
        );
      const check = lessons[index].check;
      if (
        !Number.isInteger(input.answerIndex) ||
        input.answerIndex < 0 ||
        input.answerIndex >= check.options.length
      )
        throw new ApiError(422, 'ANSWER_INVALID', 'Choose one of the displayed answers.');
      const correct = input.answerIndex === check.correct;
      const attempt = await client.query<{ id: string }>(
        `INSERT INTO pilot.lesson_attempts
        (learner_id,course_id,version,lesson_id,practice,response_mode,answer_index,correct,safety_passed,request_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          learnerId,
          course.id,
          course.version,
          lessonId,
          input.practice.trim(),
          input.responseMode,
          input.answerIndex,
          correct,
          correct,
          input.requestId,
        ],
      );
      if (correct)
        await client.query(
          `INSERT INTO pilot.lesson_completions
        (learner_id,course_id,version,lesson_id,attempt_id) VALUES($1,$2,$3,$4,$5)`,
          [learnerId, course.id, course.version, lessonId, attempt.rows[0].id],
        );
      await appendAudit(client, learnerId, 'pilot.lesson.attempted', lessonId, {
        courseId,
        version: course.version,
        correct,
      });
      return { completed: correct, repeated: false, explanation: check.explanation };
    });
  }

  async quiz(learnerId: string, courseId: string, input: QuizInput) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const existing = await client.query<QuizRow>(
        `SELECT id,course_id,score,critical_passed,answers,created_at FROM pilot.quiz_attempts
        WHERE learner_id=$1 AND request_id=$2`,
        [learnerId, input.requestId],
      );
      if (existing.rows[0]) {
        const row = existing.rows[0];
        if (row.course_id !== courseId)
          throw new ApiError(
            409,
            'REQUEST_REUSED',
            'This request ID already belongs to a different quiz.',
          );
        return {
          score: row.score,
          criticalPassed: row.critical_passed,
          passed: row.score >= POLICY.quizMinimum && row.critical_passed,
          missed: [],
          repeated: true,
        };
      }
      const course = requireActive(
        this.catalog,
        courseId,
        await prefixFor(client, this.catalog, learnerId),
      );
      if ((await submissionFor(client, learnerId, course))?.status === 'submitted')
        throw new ApiError(409, 'AWAITING_REVIEW', 'Wait for your assigned reviewer.');
      if ((await completedLessons(client, learnerId, course)).length !== lessonsFor(course).length)
        throw new ApiError(
          423,
          'PRACTICE_INCOMPLETE',
          'Complete every lesson and practice check first.',
        );
      let result: ReturnType<typeof scoreQuiz>;
      try {
        result = scoreQuiz(course, input.answers);
      } catch {
        throw new ApiError(422, 'ANSWERS_INVALID', 'Answer every displayed quiz question.');
      }
      await client.query(
        `INSERT INTO pilot.quiz_attempts
        (learner_id,course_id,version,answers,score,critical_passed,request_id)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          learnerId,
          course.id,
          course.version,
          JSON.stringify(input.answers),
          result.score,
          result.criticalPassed,
          input.requestId,
        ],
      );
      await appendAudit(client, learnerId, 'pilot.quiz.attempted', course.id, {
        version: course.version,
        score: result.score,
        criticalPassed: result.criticalPassed,
      });
      return {
        ...result,
        passed: result.score >= POLICY.quizMinimum && result.criticalPassed,
        repeated: false,
      };
    });
  }

  async submit(learnerId: string, courseId: string, input: ProjectInput) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const existing = await client.query<{ id: string; course_id: string; status: string }>(
        'SELECT id,course_id,status FROM pilot.project_submissions WHERE learner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].course_id !== courseId)
          throw new ApiError(
            409,
            'REQUEST_REUSED',
            'This request ID already belongs to another project.',
          );
        return {
          submissionId: existing.rows[0].id,
          repeated: true,
          status: existing.rows[0].status,
        };
      }
      const course = requireActive(
        this.catalog,
        courseId,
        await prefixFor(client, this.catalog, learnerId),
      );
      if ((await completedLessons(client, learnerId, course)).length !== lessonsFor(course).length)
        throw new ApiError(423, 'PRACTICE_INCOMPLETE', 'Finish all lesson checks first.');
      const quiz = await quizFor(client, learnerId, course);
      if (!quiz || quiz.score < POLICY.quizMinimum || !quiz.critical_passed)
        throw new ApiError(
          423,
          'QUIZ_INCOMPLETE',
          'Pass the five-item quiz and all safety checks first.',
        );
      const previous = await submissionFor(client, learnerId, course);
      if (previous?.status === 'submitted')
        throw new ApiError(
          409,
          'AWAITING_REVIEW',
          'This project is awaiting an assigned reviewer.',
        );
      if (previous?.status === 'approved')
        throw new ApiError(409, 'ALREADY_APPROVED', 'This course already passed.');
      if (
        !input.safetyAttested ||
        input.artefact.trim().length < POLICY.evidenceMinimum ||
        input.reflection.trim().length < POLICY.reflectionMinimum
      )
        throw new ApiError(
          422,
          'EVIDENCE_INCOMPLETE',
          'Include a safe project description (40+ characters), a reflection (20+ characters) and the privacy check.',
        );
      const submitted = await client.query<{ id: string }>(
        `INSERT INTO pilot.project_submissions
        (learner_id,course_id,version,iteration,artefact,reflection,response_mode,safety_attested,request_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING id`,
        [
          learnerId,
          course.id,
          course.version,
          (previous?.iteration ?? 0) + 1,
          input.artefact.trim(),
          input.reflection.trim(),
          input.responseMode,
          input.requestId,
        ],
      );
      await appendAudit(client, learnerId, 'pilot.project.submitted', submitted.rows[0].id, {
        courseId,
        version: course.version,
      });
      return { submissionId: submitted.rows[0].id, repeated: false, status: 'submitted' as const };
    });
  }

  async reviews(reviewerId: string) {
    const rows = await this.db.query<{
      id: string;
      course_id: string;
      version: string;
      learner_name: string;
      artefact: string;
      reflection: string;
      iteration: number;
      submitted_at: Date;
    }>(
      `
      SELECT s.id,s.course_id,s.version,u.display_name AS learner_name,s.artefact,s.reflection,s.iteration,s.submitted_at
      FROM pilot.review_assignments a JOIN pilot.project_submissions s ON s.id=a.submission_id
      JOIN pilot.users u ON u.id=s.learner_id
      WHERE a.reviewer_id=$1 AND s.status='submitted' ORDER BY a.assigned_at ASC`,
      [reviewerId],
    );
    return rows.rows.map((row) => ({
      ...row,
      courseTitle: this.catalog.course(row.course_id)?.title ?? 'Unknown course',
      rubricDimensions:
        row.course_id === 'course-44'
          ? ['scope', 'project', 'design', 'technical', 'testing', 'safety', 'presentation']
          : ['project', 'practice', 'reflection', 'safety'],
    }));
  }

  async review(reviewerId: string, submissionId: string, input: ReviewInput) {
    return inTransaction(this.db, async (client) => {
      // Resolve learner from an ASSIGNED submission, then take a consistent learner lock before any gate check.
      const candidate = await client.query<{ learner_id: string }>(
        `
        SELECT s.learner_id FROM pilot.review_assignments a JOIN pilot.project_submissions s ON s.id=a.submission_id
        WHERE a.submission_id=$1 AND a.reviewer_id=$2`,
        [submissionId, reviewerId],
      );
      if (!candidate.rows[0])
        throw new ApiError(404, 'REVIEW_UNKNOWN', 'No assigned submission found.');
      const learnerId = candidate.rows[0].learner_id;
      if (learnerId === reviewerId)
        throw new ApiError(403, 'SELF_REVIEW', 'A learner cannot review their own work.');
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const found = await client.query<SubmissionRow>(
        `
        SELECT s.* FROM pilot.project_submissions s JOIN pilot.review_assignments a ON a.submission_id=s.id
        WHERE s.id=$1 AND a.reviewer_id=$2 FOR UPDATE OF s`,
        [submissionId, reviewerId],
      );
      const submitted = found.rows[0];
      if (!submitted || submitted.status !== 'submitted')
        throw new ApiError(
          409,
          'REVIEW_ALREADY_DONE',
          'This submission is no longer awaiting review.',
        );
      const course = requireActive(
        this.catalog,
        submitted.course_id,
        await prefixFor(client, this.catalog, learnerId),
      );
      if (course.version !== submitted.version)
        throw new ApiError(409, 'CONTENT_CHANGED', 'Submission version is not the current draft.');
      if ((await completedLessons(client, learnerId, course)).length !== lessonsFor(course).length)
        throw new ApiError(
          409,
          'PRACTICE_INCOMPLETE',
          'This learner has not completed the required practice.',
        );
      const quiz = await quizFor(client, learnerId, course);
      if (!quiz || quiz.score < POLICY.quizMinimum || !quiz.critical_passed)
        throw new ApiError(
          409,
          'QUIZ_INCOMPLETE',
          'This learner has not passed the required quiz and safety checks.',
        );
      if (input.feedback.trim().length < 10)
        throw new ApiError(
          422,
          'FEEDBACK_SHORT',
          'Provide at least ten characters of useful feedback.',
        );
      let score: ReturnType<typeof scoreRubric>;
      try {
        score = scoreRubric(course, quiz.score, input.rubric);
      } catch {
        throw new ApiError(422, 'RUBRIC_INVALID', 'Provide each rubric dimension from 0 to 100.');
      }
      if (
        input.decision === 'approved' &&
        (!input.safetyApproved ||
          score.safety < POLICY.projectMinimum ||
          score.project < POLICY.projectMinimum ||
          score.overall < POLICY.projectMinimum)
      )
        throw new ApiError(
          422,
          'GATE_FAILED',
          'A pass requires an approved safety check, safety and project rubric of 70+, and an overall score of 70+. Request revision instead.',
        );
      await client.query(
        `INSERT INTO pilot.review_decisions
        (submission_id,reviewer_id,decision,rubric,project_score,overall_score,safety_approved,feedback)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          submissionId,
          reviewerId,
          input.decision,
          JSON.stringify(input.rubric),
          score.project,
          score.overall,
          input.safetyApproved,
          input.feedback.trim(),
        ],
      );
      await client.query('UPDATE pilot.project_submissions SET status=$2 WHERE id=$1', [
        submissionId,
        input.decision,
      ]);
      let completed = false;
      if (input.decision === 'approved') {
        const record = await client.query<{ id: string }>(
          `INSERT INTO pilot.course_completions
          (learner_id,course_id,version,policy_version,sequence_number,quiz_attempt_id,submission_id,reviewer_id,quiz_score,project_score,overall_score)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [
            learnerId,
            course.id,
            course.version,
            POLICY_VERSION,
            course.number,
            quiz.id,
            submissionId,
            reviewerId,
            quiz.score,
            score.project,
            score.overall,
          ],
        );
        const next = this.catalog.courses[course.number];
        if (next)
          await client.query(
            `INSERT INTO pilot.unlock_events(learner_id,unlocked_course_id,version,from_completion_id)
          VALUES($1,$2,$3,$4)`,
            [learnerId, next.id, next.version, record.rows[0].id],
          );
        completed = true;
      }
      await appendAudit(client, reviewerId, 'pilot.review.decided', submissionId, {
        learnerId,
        courseId: course.id,
        version: course.version,
        decision: input.decision,
        quizScore: quiz.score,
        projectScore: score.project,
        overallScore: score.overall,
        safetyApproved: input.safetyApproved,
      });
      return {
        completed,
        decision: input.decision,
        projectScore: score.project,
        overallScore: score.overall,
        nextCourseId: completed ? (this.catalog.courses[course.number]?.id ?? null) : null,
      };
    });
  }
}

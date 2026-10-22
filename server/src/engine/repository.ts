import type { PoolClient } from 'pg';
import { appendAudit } from '../db.js';
import { ApiError } from '../security.js';
import type {
  CompletionTransaction,
  CourseRef,
  ProgressionRepository,
  ProgressScope,
  ProgressState,
  ReviewGate,
} from './contracts.js';
import {
  ENGINE_POLICY,
  ENGINE_POLICY_VERSION,
  GUIDED_LESSON,
  type EngineCatalog,
} from './catalog.js';
import { nextProgressState, type Transition } from './policy.js';

export async function transitionProgress(
  client: PoolClient,
  scope: ProgressScope,
  learnerId: string,
  releaseId: string,
  courseId: string,
  moduleId: string | null,
  event: Transition,
  actorId: string | null,
  reason: string,
) {
  const table = scope === 'COURSE' ? 'learning.course_progress' : 'learning.module_progress';
  // Identifiers above are fixed server strings, never interpolated from a request.
  const params =
    scope === 'COURSE'
      ? [learnerId, releaseId, courseId]
      : [learnerId, releaseId, courseId, moduleId];
  const found = await client.query<{ state: ProgressState }>(
    `SELECT state FROM ${table} WHERE learner_id=$1 AND release_id=$2 AND course_id=$3
     ${scope === 'MODULE' ? 'AND module_id=$4' : ''} FOR UPDATE`,
    params,
  );
  const from = found.rows[0]?.state;
  if (!from)
    throw new ApiError(409, 'PROGRESS_MISSING', 'Required progress record was not initialized.');
  let next: ProgressState;
  try {
    next = nextProgressState(from, event, scope);
  } catch {
    throw new ApiError(409, 'INVALID_TRANSITION', `${from} cannot transition via ${event}.`);
  }
  const changed = await client.query(
    `UPDATE ${table} SET state=$${params.length + 1},revision=revision+1,updated_at=now()
     WHERE learner_id=$1 AND release_id=$2 AND course_id=$3
       ${scope === 'MODULE' ? 'AND module_id=$4' : ''} AND state=$${params.length + 2}`,
    [...params, next, from],
  );
  if (changed.rowCount !== 1)
    throw new ApiError(409, 'PROGRESS_RACE', 'Progress changed; refresh and retry.');
  await client.query(
    `INSERT INTO learning.progress_events
     (learner_id,release_id,course_id,module_id,from_state,to_state,actor_id,reason)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [learnerId, releaseId, courseId, moduleId, from, next, actorId, reason],
  );
  return next;
}

type ReviewRecord = {
  learner_id: string;
  release_id: string;
  course_id: string;
  reviewer_id: string;
  assigned_reviewer: string;
  decision: string;
  quiz_id: string | null;
  quiz_score: number | null;
  critical_passed: boolean | null;
  project_score: number;
  overall_score: number;
  safety_score: number;
  safety_approved: boolean;
  lesson_count: string;
  finished_modules: string;
  final_module_state: ProgressState | null;
  guided_run_ok: boolean | null;
  submission_id: string;
};
export class PgApprovalRepository implements ProgressionRepository {
  constructor(
    private client: PoolClient,
    private catalog: EngineCatalog,
  ) {}

  async withLearnerLock<T>(
    learnerId: string,
    work: (tx: CompletionTransaction) => Promise<T>,
  ): Promise<T> {
    const user = await this.client.query<{ id: string }>(
      "SELECT id FROM pilot.users WHERE id=$1 AND role='learner' AND status='active' FOR UPDATE",
      [learnerId],
    );
    if (!user.rows[0])
      throw new ApiError(403, 'LEARNER_DISABLED', 'Active learner account required.');
    return work(this.transaction(learnerId));
  }
  private async reviewRecord(decisionId: string): Promise<ReviewRecord | null> {
    const result = await this.client.query<ReviewRecord>(
      `SELECT s.learner_id,s.release_id,s.course_id,s.id AS submission_id,
        d.reviewer_id,a.reviewer_id AS assigned_reviewer,d.decision,
        d.project_score,d.overall_score,d.safety_score,d.safety_approved,
        q.id AS quiz_id,q.score AS quiz_score,q.critical_passed,
        (SELECT count(*) FROM learning.lesson_passes lp
         WHERE lp.learner_id=s.learner_id AND lp.release_id=s.release_id AND lp.course_id=s.course_id) AS lesson_count,
        (SELECT count(*) FROM learning.module_progress mp
         JOIN learning.modules m ON m.release_id=mp.release_id AND m.course_id=mp.course_id AND m.id=mp.module_id
         WHERE mp.learner_id=s.learner_id AND mp.release_id=s.release_id AND mp.course_id=s.course_id
           AND mp.state='COMPLETED' AND m.ordinal < 4) AS finished_modules,
        (SELECT mp.state FROM learning.module_progress mp
         JOIN learning.modules m ON m.release_id=mp.release_id AND m.course_id=mp.course_id AND m.id=mp.module_id
         WHERE mp.learner_id=s.learner_id AND mp.release_id=s.release_id AND mp.course_id=s.course_id AND m.ordinal=4) AS final_module_state,
        (SELECT r.passed AND r.source='SERVER_VERIFIED' FROM learning.lesson_passes lp
         LEFT JOIN learning.sandbox_runs r ON r.id=lp.guided_run_id
         WHERE lp.learner_id=s.learner_id AND lp.release_id=s.release_id AND lp.course_id=s.course_id
           AND lp.lesson_id=$2) AS guided_run_ok
       FROM learning.review_decisions d JOIN learning.project_submissions s ON s.id=d.submission_id
       JOIN learning.review_assignments a ON a.submission_id=s.id
       LEFT JOIN LATERAL (
         SELECT id,score,critical_passed FROM learning.quiz_attempts
         WHERE learner_id=s.learner_id AND release_id=s.release_id AND course_id=s.course_id
         ORDER BY id DESC LIMIT 1
       ) q ON true
       WHERE d.submission_id=$1`,
      [decisionId, GUIDED_LESSON.lessonId],
    );
    return result.rows[0] ?? null;
  }
  private transaction(learnerId: string): CompletionTransaction {
    const c = this.client;
    return {
      activeRelease: async () => {
        const found = await c.query<{
          id: string;
          version: string;
          policy_version: string;
          content_sha256: string;
        }>(
          `SELECT r.id,r.version,r.policy_version,r.content_sha256 FROM learning.enrollments e
           JOIN learning.catalog_releases r ON r.id=e.active_release_id AND r.policy_version=e.pinned_policy_version
           WHERE e.learner_id=$1 AND e.status='active' AND r.status='internal_draft'`,
          [learnerId],
        );
        const release = found.rows[0];
        if (!release)
          throw new ApiError(403, 'ENGINE_NOT_ENROLLED', 'Operator enrolment is required.');
        if (
          release.version !== this.catalog.version ||
          release.content_sha256 !== this.catalog.hash ||
          release.policy_version !== ENGINE_POLICY_VERSION
        )
          throw new ApiError(409, 'RELEASE_CHANGED', 'Pinned content or policy is not active.');
        return {
          id: release.id,
          policyVersion: release.policy_version,
          courseCount: this.catalog.courses.length,
        };
      },
      completedPrefix: async (owner, releaseId, policyVersion) => {
        const found = await c.query<{ sequence_no: number; course_id: string }>(
          `SELECT sequence_no,course_id FROM learning.course_completions
           WHERE learner_id=$1 AND release_id=$2 AND policy_version=$3 ORDER BY sequence_no`,
          [owner, releaseId, policyVersion],
        );
        let prefix = 0;
        for (const row of found.rows) {
          if (
            row.sequence_no !== ++prefix ||
            this.catalog.courses[prefix - 1]?.id !== row.course_id
          )
            throw new ApiError(
              409,
              'PROGRESS_CORRUPT',
              'Completion history has an invalid sequence.',
            );
        }
        return prefix;
      },
      courseBySequence: async (sequence, releaseId) => {
        const found = await c.query<{ id: string; sequence_no: number; policy_version: string }>(
          `SELECT c.id,c.sequence_no,r.policy_version FROM learning.courses c
           JOIN learning.course_content cc ON cc.course_id=c.id
           JOIN learning.catalog_releases r ON r.id=cc.release_id
           WHERE c.sequence_no=$1 AND cc.release_id=$2`,
          [sequence, releaseId],
        );
        const row = found.rows[0];
        if (!row || this.catalog.courses[sequence - 1]?.id !== row.id) return null;
        return {
          id: row.id,
          sequenceNo: row.sequence_no,
          releaseId,
          policyVersion: row.policy_version,
        };
      },
      courseState: async (owner, course) => {
        const found = await c.query<{ state: ProgressState }>(
          'SELECT state FROM learning.course_progress WHERE learner_id=$1 AND release_id=$2 AND course_id=$3',
          [owner, course.releaseId, course.id],
        );
        if (!found.rows[0])
          throw new ApiError(409, 'PROGRESS_MISSING', 'Course progress is missing.');
        return found.rows[0].state;
      },
      priorApproval: async (owner, requestId) => {
        const found = await c.query<{
          learner_id: string;
          release_id: string;
          policy_version: string;
          course_id: string;
          reviewer_id: string;
          submission_id: string;
          sequence_no: number;
        }>(
          'SELECT learner_id,release_id,policy_version,course_id,reviewer_id,submission_id,sequence_no FROM learning.course_completions WHERE learner_id=$1 AND request_id=$2',
          [owner, requestId],
        );
        const row = found.rows[0];
        if (!row) return null;
        return {
          learnerId: row.learner_id,
          releaseId: row.release_id,
          policyVersion: row.policy_version,
          courseId: row.course_id,
          reviewerId: row.reviewer_id,
          decisionId: row.submission_id,
          nextCourseId: this.catalog.courses[row.sequence_no]?.id ?? null,
          repeated: true,
        };
      },
      trustedReviewGate: async (decisionId): Promise<ReviewGate | null> => {
        const row = await this.reviewRecord(decisionId);
        if (!row) return null;
        const requiredGuided = row.course_id === GUIDED_LESSON.courseId;
        return {
          learnerId: row.learner_id,
          releaseId: row.release_id,
          policyVersion: ENGINE_POLICY_VERSION,
          courseId: row.course_id,
          assignedReviewerId: row.assigned_reviewer,
          decisionReviewerId: row.reviewer_id,
          decisionApproved: row.decision === 'approved',
          allRequiredModulesPassed:
            Number(row.lesson_count) === 4 &&
            Number(row.finished_modules) === 3 &&
            row.final_module_state === 'SUBMITTED_FOR_REVIEW' &&
            (!requiredGuided || row.guided_run_ok === true),
          quizScore: row.quiz_score ?? -1,
          quizMinimum: ENGINE_POLICY.quizMinimum,
          allCriticalChecksPassed: row.critical_passed === true,
          projectScore: row.project_score,
          overallScore: row.overall_score,
          safetyScore: row.safety_score,
          rubricMinimum: ENGINE_POLICY.projectMinimum,
          safetyApproved: row.safety_approved,
          gradedEvidenceSource: 'HUMAN_REVIEWED',
          gradedProjectScope: 'GUIDED',
        };
      },
      completeAndUnlock: async (input) => this.writeCompletion(input),
    };
  }
  private async writeCompletion(input: {
    learnerId: string;
    course: CourseRef;
    reviewerId: string;
    decisionId: string;
    requestId: string;
    nextCourseId: string | null;
  }) {
    const row = await this.reviewRecord(input.decisionId);
    if (
      !row?.quiz_id ||
      row.learner_id !== input.learnerId ||
      row.course_id !== input.course.id ||
      row.release_id !== input.course.releaseId ||
      row.reviewer_id !== input.reviewerId ||
      row.decision !== 'approved'
    )
      throw new ApiError(409, 'REVIEW_CHANGED', 'The trusted review is unavailable.');
    const c = this.client;
    await c.query(
      `INSERT INTO learning.course_completions
       (learner_id,release_id,course_id,policy_version,sequence_no,quiz_attempt_id,
        submission_id,reviewer_id,quiz_score,project_score,overall_score,safety_score,request_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        input.learnerId,
        input.course.releaseId,
        input.course.id,
        input.course.policyVersion,
        input.course.sequenceNo,
        row.quiz_id,
        input.decisionId,
        input.reviewerId,
        row.quiz_score,
        row.project_score,
        row.overall_score,
        row.safety_score,
        input.requestId,
      ],
    );
    const last = await c.query<{ id: string }>(
      'SELECT id FROM learning.modules WHERE release_id=$1 AND course_id=$2 AND ordinal=4',
      [input.course.releaseId, input.course.id],
    );
    if (!last.rows[0])
      throw new ApiError(409, 'RELEASE_INVALID', 'Required fourth module is missing.');
    await transitionProgress(
      c,
      'MODULE',
      input.learnerId,
      input.course.releaseId,
      input.course.id,
      last.rows[0].id,
      'APPROVE',
      input.reviewerId,
      'assigned-review-approved',
    );
    await transitionProgress(
      c,
      'COURSE',
      input.learnerId,
      input.course.releaseId,
      input.course.id,
      null,
      'APPROVE',
      input.reviewerId,
      'assigned-review-approved',
    );
    if (input.nextCourseId) {
      await transitionProgress(
        c,
        'COURSE',
        input.learnerId,
        input.course.releaseId,
        input.nextCourseId,
        null,
        'UNLOCK',
        input.reviewerId,
        'preceding-course-passed',
      );
      const first = await c.query<{ id: string }>(
        'SELECT id FROM learning.modules WHERE release_id=$1 AND course_id=$2 AND ordinal=1',
        [input.course.releaseId, input.nextCourseId],
      );
      if (!first.rows[0])
        throw new ApiError(409, 'RELEASE_INVALID', 'Next course module is missing.');
      await transitionProgress(
        c,
        'MODULE',
        input.learnerId,
        input.course.releaseId,
        input.nextCourseId,
        first.rows[0].id,
        'UNLOCK',
        input.reviewerId,
        'preceding-course-passed',
      );
    }
    await appendAudit(c, input.reviewerId, 'learning.review.approved', input.decisionId, {
      learnerId: input.learnerId,
      courseId: input.course.id,
      nextCourseId: input.nextCourseId,
      releaseId: input.course.releaseId,
      policyVersion: input.course.policyVersion,
    });
  }
}

import type {
  ApprovalResult,
  ApproveReviewCommand,
  CourseRef,
  ExpectedRun,
  ProgressionRepository,
  ProgressScope,
  ProgressState,
  ReviewGate,
  VerifiedRunRecord,
} from './contracts.js';

/** Design-time v2 policy scaffold; not an API route or a production DB adapter. */
export class EnginePolicyError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type Transition =
  | 'UNLOCK'
  | 'START'
  | 'AUTO_FAIL'
  | 'RETRY'
  | 'SUBMIT_REVIEW'
  | 'REQUEST_REVISION'
  | 'APPROVE'
  | 'AUTO_COMPLETE_MODULE';

const transitions: Record<ProgressState, Partial<Record<Transition, ProgressState>>> = {
  LOCKED: { UNLOCK: 'AVAILABLE' },
  AVAILABLE: { START: 'IN_PROGRESS' },
  IN_PROGRESS: {
    AUTO_FAIL: 'FAILED_REMEDIATION',
    SUBMIT_REVIEW: 'SUBMITTED_FOR_REVIEW',
    AUTO_COMPLETE_MODULE: 'COMPLETED',
  },
  SUBMITTED_FOR_REVIEW: { REQUEST_REVISION: 'NEEDS_REVISION', APPROVE: 'COMPLETED' },
  NEEDS_REVISION: { RETRY: 'IN_PROGRESS' },
  FAILED_REMEDIATION: { RETRY: 'IN_PROGRESS' },
  COMPLETED: {},
};

/** Checks a label transition only. The service/repository MUST verify the evidence and actor. */
export function nextProgressState(current: ProgressState, event: Transition, scope: ProgressScope) {
  if (event === 'AUTO_COMPLETE_MODULE' && scope !== 'MODULE')
    throw new EnginePolicyError('REVIEW_REQUIRED', 'Course completion needs an assigned review.');
  const next = transitions[current][event];
  if (!next)
    throw new EnginePolicyError('INVALID_TRANSITION', `${current} cannot transition via ${event}.`);
  return next;
}

/** A forged URL or local storage edit can never substitute for the contiguous server prefix. */
export function requireActiveCourse(
  course: CourseRef,
  completedPrefix: number,
  releaseId: string,
  policyVersion: string,
) {
  if (!Number.isInteger(completedPrefix) || completedPrefix < 0 || completedPrefix > 44)
    throw new EnginePolicyError('INVALID_PREFIX', 'Invalid server completion prefix.');
  if (course.releaseId !== releaseId || course.policyVersion !== policyVersion)
    throw new EnginePolicyError(
      'STALE_RELEASE',
      'Course content or progression policy has changed.',
    );
  if (course.sequenceNo !== completedPrefix + 1)
    throw new EnginePolicyError('COURSE_LOCKED', 'Only the next required course is available.');
}

/** Called only on a server-loaded, attested immutable runner record, never a client-provided object. */
export function requireTrustedGuidedRun(run: VerifiedRunRecord, expected: ExpectedRun) {
  if (
    run.source !== 'SERVER_VERIFIED' ||
    run.scope !== 'GUIDED' ||
    !run.passed ||
    !run.safetyPassed
  )
    throw new EnginePolicyError('RUN_UNTRUSTED', 'This run cannot satisfy a required lesson.');
  const fields: (keyof ExpectedRun)[] = [
    'learnerId',
    'releaseId',
    'courseId',
    'moduleId',
    'lessonId',
    'projectId',
    'revisionNo',
    'revisionHash',
    'assessmentSpecId',
    'evaluatorVersion',
  ];
  if (fields.some((field) => run[field] !== expected[field]))
    throw new EnginePolicyError(
      'RUN_MISMATCH',
      'The run is not from the required lesson and revision.',
    );
}

/** All values MUST be read from server-owned records in the same locked transaction. */
export function requireApprovedGates(
  gate: ReviewGate,
  command: ApproveReviewCommand,
  course: CourseRef,
) {
  if (command.learnerId === command.reviewerId)
    throw new EnginePolicyError('SELF_REVIEW', 'Learners cannot review their own work.');
  if (
    gate.learnerId !== command.learnerId ||
    gate.courseId !== command.courseId ||
    gate.releaseId !== course.releaseId ||
    gate.policyVersion !== course.policyVersion ||
    gate.assignedReviewerId !== command.reviewerId ||
    gate.decisionReviewerId !== command.reviewerId
  )
    throw new EnginePolicyError(
      'REVIEW_DENIED',
      'This decision is not assigned to the correct reviewer and release.',
    );
  if (
    !gate.decisionApproved ||
    !gate.allRequiredModulesPassed ||
    !gate.allCriticalChecksPassed ||
    !gate.safetyApproved ||
    ![
      gate.quizScore,
      gate.quizMinimum,
      gate.projectScore,
      gate.overallScore,
      gate.safetyScore,
      gate.rubricMinimum,
    ].every((value) => Number.isInteger(value) && value >= 0 && value <= 100) ||
    gate.quizScore < gate.quizMinimum ||
    gate.projectScore < gate.rubricMinimum ||
    gate.overallScore < gate.rubricMinimum ||
    gate.safetyScore < gate.rubricMinimum ||
    !['SERVER_VERIFIED', 'HUMAN_REVIEWED'].includes(gate.gradedEvidenceSource) ||
    gate.gradedProjectScope !== 'GUIDED'
  )
    throw new EnginePolicyError(
      'GATE_FAILED',
      'Required assessment, safety or human-review gates have not passed.',
    );
}

/**
 * Short transaction scaffold. The repository implementation must use PostgreSQL,
 * lock the learner, enforce idempotency and atomically write completion/unlock.
 * Untrusted sandbox execution must finish before this method is called.
 */
export async function approveReviewedCourse(
  repository: ProgressionRepository,
  command: ApproveReviewCommand,
): Promise<ApprovalResult> {
  return repository.withLearnerLock(command.learnerId, async (tx) => {
    const release = await tx.activeRelease();
    const previous = await tx.priorApproval(command.learnerId, command.requestId);
    if (previous) {
      if (
        previous.courseId !== command.courseId ||
        previous.reviewerId !== command.reviewerId ||
        previous.decisionId !== command.decisionId
      )
        throw new EnginePolicyError('REQUEST_REUSED', 'This request ID belongs to another review.');
      if (previous.releaseId !== release.id || previous.policyVersion !== release.policyVersion)
        throw new EnginePolicyError(
          'STALE_RELEASE',
          'This response belongs to an older curriculum or policy.',
        );
      return { ...previous, repeated: true };
    }
    if (release.courseCount !== 44)
      throw new EnginePolicyError(
        'RELEASE_INVALID',
        'The required release must contain exactly 44 courses.',
      );
    const prefix = await tx.completedPrefix(command.learnerId, release.id, release.policyVersion);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix >= release.courseCount)
      throw new EnginePolicyError('COURSE_LOCKED', 'No current course is available to approve.');
    const course = await tx.courseBySequence(prefix + 1, release.id);
    if (!course || course.id !== command.courseId)
      throw new EnginePolicyError('COURSE_LOCKED', 'This is not the next required course.');
    requireActiveCourse(course, prefix, release.id, release.policyVersion);
    if ((await tx.courseState(command.learnerId, course)) !== 'SUBMITTED_FOR_REVIEW')
      throw new EnginePolicyError(
        'REVIEW_NOT_READY',
        'Only an awaiting-review course can be approved.',
      );
    const gate = await tx.trustedReviewGate(command.decisionId);
    if (!gate)
      throw new EnginePolicyError('REVIEW_NOT_FOUND', 'No approved assigned review found.');
    requireApprovedGates(gate, command, course);
    const next =
      prefix + 2 <= release.courseCount ? await tx.courseBySequence(prefix + 2, release.id) : null;
    if (prefix + 2 <= release.courseCount && !next)
      throw new EnginePolicyError('RELEASE_INVALID', 'The next required course is missing.');
    await tx.completeAndUnlock({
      learnerId: command.learnerId,
      course,
      reviewerId: command.reviewerId,
      decisionId: command.decisionId,
      requestId: command.requestId,
      nextCourseId: next?.id ?? null,
    });
    return {
      learnerId: command.learnerId,
      releaseId: release.id,
      policyVersion: release.policyVersion,
      courseId: course.id,
      reviewerId: command.reviewerId,
      decisionId: command.decisionId,
      nextCourseId: next?.id ?? null,
      repeated: false,
    };
  });
}

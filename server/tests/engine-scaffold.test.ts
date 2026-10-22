import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveReviewedCourse,
  nextProgressState,
  requireActiveCourse,
  requireTrustedGuidedRun,
} from '../src/engine/policy.js';
import type {
  ApproveReviewCommand,
  CompletionTransaction,
  ExpectedRun,
  ProgressionRepository,
  ReviewGate,
  VerifiedRunRecord,
} from '../src/engine/contracts.js';

const release = { id: 'release-draft-2', policyVersion: 'policy-2', courseCount: 44 };
const course1 = {
  id: 'course-01',
  sequenceNo: 1,
  releaseId: release.id,
  policyVersion: release.policyVersion,
};
const course2 = {
  id: 'course-02',
  sequenceNo: 2,
  releaseId: release.id,
  policyVersion: release.policyVersion,
};
const command: ApproveReviewCommand = {
  learnerId: 'adult-learner',
  courseId: course1.id,
  reviewerId: 'assigned-reviewer',
  decisionId: 'decision-1',
  requestId: 'request-1',
};
const goodGate: ReviewGate = {
  learnerId: command.learnerId,
  releaseId: release.id,
  policyVersion: release.policyVersion,
  courseId: course1.id,
  assignedReviewerId: command.reviewerId,
  decisionReviewerId: command.reviewerId,
  decisionApproved: true,
  allRequiredModulesPassed: true,
  quizScore: 80,
  quizMinimum: 80,
  allCriticalChecksPassed: true,
  projectScore: 70,
  overallScore: 70,
  safetyScore: 70,
  rubricMinimum: 70,
  safetyApproved: true,
  gradedEvidenceSource: 'SERVER_VERIFIED',
  gradedProjectScope: 'GUIDED',
};

function fixture(overrides: Partial<CompletionTransaction> = {}) {
  const writes: Parameters<CompletionTransaction['completeAndUnlock']>[0][] = [];
  const tx: CompletionTransaction = {
    activeRelease: async () => release,
    completedPrefix: async () => 0,
    courseBySequence: async (ordinal) => (ordinal === 1 ? course1 : ordinal === 2 ? course2 : null),
    courseState: async () => 'SUBMITTED_FOR_REVIEW',
    priorApproval: async () => null,
    trustedReviewGate: async () => goodGate,
    completeAndUnlock: async (input) => {
      writes.push(input);
    },
    ...overrides,
  };
  const repository: ProgressionRepository = {
    withLearnerLock: async (learnerId, work) => {
      assert.equal(learnerId, command.learnerId);
      return work(tx);
    },
  };
  return { repository, writes };
}

test('v2 labels permit remediation and review, never a LOCKED shortcut', () => {
  assert.equal(nextProgressState('LOCKED', 'UNLOCK', 'COURSE'), 'AVAILABLE');
  assert.equal(nextProgressState('IN_PROGRESS', 'AUTO_FAIL', 'MODULE'), 'FAILED_REMEDIATION');
  assert.equal(nextProgressState('FAILED_REMEDIATION', 'RETRY', 'MODULE'), 'IN_PROGRESS');
  assert.equal(nextProgressState('NEEDS_REVISION', 'RETRY', 'COURSE'), 'IN_PROGRESS');
  assert.equal(nextProgressState('SUBMITTED_FOR_REVIEW', 'APPROVE', 'COURSE'), 'COMPLETED');
  assert.throws(() => nextProgressState('LOCKED', 'APPROVE', 'COURSE'), {
    code: 'INVALID_TRANSITION',
  });
  assert.throws(() => nextProgressState('IN_PROGRESS', 'AUTO_COMPLETE_MODULE', 'COURSE'), {
    code: 'REVIEW_REQUIRED',
  });
  assert.throws(() => nextProgressState('COMPLETED', 'START', 'COURSE'), {
    code: 'INVALID_TRANSITION',
  });
});

test('only the next current-release course is active regardless of browser state', () => {
  requireActiveCourse(course1, 0, release.id, release.policyVersion);
  assert.throws(() => requireActiveCourse(course2, 0, release.id, release.policyVersion), {
    code: 'COURSE_LOCKED',
  });
  assert.throws(() => requireActiveCourse(course1, 0, 'old-release', release.policyVersion), {
    code: 'STALE_RELEASE',
  });
  assert.throws(() => requireActiveCourse(course1, 0, release.id, 'old-policy'), {
    code: 'STALE_RELEASE',
  });
});

test('free-play, browser feedback and altered revision hashes never count as graded evidence', () => {
  const expected: ExpectedRun = {
    learnerId: command.learnerId,
    releaseId: release.id,
    courseId: course1.id,
    moduleId: 'module-1',
    lessonId: 'lesson-1',
    projectId: 'guided-1',
    revisionNo: 1,
    revisionHash: 'sha256:fictional',
    assessmentSpecId: 'spec-1',
    evaluatorVersion: 'v1',
  };
  const good: VerifiedRunRecord = {
    ...expected,
    source: 'SERVER_VERIFIED',
    scope: 'GUIDED',
    passed: true,
    safetyPassed: true,
  };
  requireTrustedGuidedRun(good, expected);
  assert.throws(() => requireTrustedGuidedRun({ ...good, scope: 'PLAYGROUND' }, expected), {
    code: 'RUN_UNTRUSTED',
  });
  assert.throws(() => requireTrustedGuidedRun({ ...good, source: 'BROWSER_FEEDBACK' }, expected), {
    code: 'RUN_UNTRUSTED',
  });
  assert.throws(() => requireTrustedGuidedRun({ ...good, revisionHash: 'altered' }, expected), {
    code: 'RUN_MISMATCH',
  });
  assert.throws(() => requireTrustedGuidedRun({ ...good, evaluatorVersion: 'v0' }, expected), {
    code: 'RUN_MISMATCH',
  });
});

test('review approval scaffold opens exactly Course 02 after all server-owned gates', async () => {
  const { repository, writes } = fixture();
  assert.deepEqual(await approveReviewedCourse(repository, command), {
    learnerId: command.learnerId,
    releaseId: release.id,
    policyVersion: release.policyVersion,
    courseId: course1.id,
    reviewerId: command.reviewerId,
    decisionId: command.decisionId,
    nextCourseId: course2.id,
    repeated: false,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].nextCourseId, course2.id);
  assert.equal(writes[0].requestId, command.requestId);
});

test('wrong course, missing review, failed safety or free-play grade cannot write completion', async () => {
  for (const overrides of [
    { completedPrefix: async () => 1 },
    { courseState: async () => 'LOCKED' as const },
    { trustedReviewGate: async () => null },
    { trustedReviewGate: async () => ({ ...goodGate, safetyApproved: false }) },
    { trustedReviewGate: async () => ({ ...goodGate, gradedProjectScope: 'PLAYGROUND' as const }) },
    { trustedReviewGate: async () => ({ ...goodGate, assignedReviewerId: 'someone-else' }) },
    { trustedReviewGate: async () => ({ ...goodGate, quizScore: Number.NaN }) },
  ] satisfies Partial<CompletionTransaction>[]) {
    const { repository, writes } = fixture(overrides);
    await assert.rejects(approveReviewedCourse(repository, command));
    assert.equal(writes.length, 0);
  }
});

test('same request ID repeats only its own review outcome', async () => {
  const prior = {
    learnerId: command.learnerId,
    releaseId: release.id,
    policyVersion: release.policyVersion,
    courseId: course1.id,
    reviewerId: command.reviewerId,
    decisionId: command.decisionId,
    nextCourseId: course2.id,
    repeated: false,
  };
  const same = fixture({ priorApproval: async () => prior });
  assert.equal((await approveReviewedCourse(same.repository, command)).repeated, true);
  assert.equal(same.writes.length, 0);
  const reused = fixture({ priorApproval: async () => ({ ...prior, courseId: course2.id }) });
  await assert.rejects(approveReviewedCourse(reused.repository, command), {
    code: 'REQUEST_REUSED',
  });
  assert.equal(reused.writes.length, 0);
  const stale = fixture({ priorApproval: async () => ({ ...prior, policyVersion: 'old-policy' }) });
  await assert.rejects(approveReviewedCourse(stale.repository, command), { code: 'STALE_RELEASE' });
  assert.equal(stale.writes.length, 0);
});

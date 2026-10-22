/**
 * Proposed v2 learning-engine contracts. Not wired to /api or migrated into PostgreSQL.
 * The existing adult pilot remains the only active server-authoritative pathway.
 * Never construct trusted evidence or grade fields from a browser request.
 */
export const PROGRESS_STATES = [
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS',
  'SUBMITTED_FOR_REVIEW',
  'NEEDS_REVISION',
  'FAILED_REMEDIATION',
  'COMPLETED',
] as const;
export type ProgressState = (typeof PROGRESS_STATES)[number];
export type ProgressScope = 'COURSE' | 'MODULE';
export type ProjectScope = 'GUIDED' | 'PLAYGROUND';
export type ToolKind =
  | 'VISUAL'
  | 'WEB'
  | 'JAVASCRIPT'
  | 'PYTHON'
  | 'SQL'
  | 'GAME_2D'
  | 'ROBOTICS'
  | 'WIREFRAME'
  | 'SPREADSHEET'
  | 'DESIGN';

export interface CourseRef {
  id: string;
  sequenceNo: number;
  releaseId: string;
  policyVersion: string;
}
export interface ReleaseRef {
  id: string;
  policyVersion: string;
  courseCount: number;
}

/** Data loaded from a trusted runner's immutable record, not directly from client JSON. */
export interface VerifiedRunRecord {
  source: 'SERVER_VERIFIED' | 'BROWSER_FEEDBACK';
  scope: ProjectScope;
  learnerId: string;
  releaseId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  projectId: string;
  revisionNo: number;
  revisionHash: string;
  assessmentSpecId: string;
  evaluatorVersion: string;
  passed: boolean;
  safetyPassed: boolean;
}
export type ExpectedRun = Pick<
  VerifiedRunRecord,
  | 'learnerId'
  | 'releaseId'
  | 'courseId'
  | 'moduleId'
  | 'lessonId'
  | 'projectId'
  | 'revisionNo'
  | 'revisionHash'
  | 'assessmentSpecId'
  | 'evaluatorVersion'
>;

/** Populated by the repository from versioned assessments, project and assigned review. */
export interface ReviewGate {
  learnerId: string;
  releaseId: string;
  policyVersion: string;
  courseId: string;
  assignedReviewerId: string;
  decisionReviewerId: string;
  decisionApproved: boolean;
  allRequiredModulesPassed: boolean;
  quizScore: number;
  quizMinimum: number;
  allCriticalChecksPassed: boolean;
  projectScore: number;
  overallScore: number;
  safetyScore: number;
  rubricMinimum: number;
  safetyApproved: boolean;
  gradedEvidenceSource: 'SERVER_VERIFIED' | 'HUMAN_REVIEWED' | 'BROWSER_FEEDBACK';
  gradedProjectScope: ProjectScope;
}

export interface ApproveReviewCommand {
  learnerId: string;
  courseId: string;
  reviewerId: string;
  decisionId: string;
  requestId: string;
}
export interface ApprovalResult {
  learnerId: string;
  releaseId: string;
  policyVersion: string;
  courseId: string;
  reviewerId: string;
  decisionId: string;
  nextCourseId: string | null;
  repeated: boolean;
}
export interface CompletionTransaction {
  /** Read this learner's server-pinned published release, not the newest global release. */
  activeRelease(): Promise<ReleaseRef>;
  completedPrefix(learnerId: string, releaseId: string, policyVersion: string): Promise<number>;
  courseBySequence(sequenceNo: number, releaseId: string): Promise<CourseRef | null>;
  courseState(learnerId: string, course: CourseRef): Promise<ProgressState>;
  priorApproval(learnerId: string, requestId: string): Promise<ApprovalResult | null>;
  trustedReviewGate(decisionId: string): Promise<ReviewGate | null>;
  /** Must insert reviewed completion, progress event and exactly one next unlock atomically. */
  completeAndUnlock(input: {
    learnerId: string;
    course: CourseRef;
    reviewerId: string;
    decisionId: string;
    requestId: string;
    nextCourseId: string | null;
  }): Promise<void>;
}
export interface ProgressionRepository {
  /** PostgreSQL implementation MUST SELECT the learner row FOR UPDATE in this transaction. */
  withLearnerLock<T>(
    learnerId: string,
    work: (tx: CompletionTransaction) => Promise<T>,
  ): Promise<T>;
}

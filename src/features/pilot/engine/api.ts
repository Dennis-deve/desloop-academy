import { pilotRequest, type PilotCourseDetail } from '../api';

export type EngineState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'SUBMITTED_FOR_REVIEW'
  | 'NEEDS_REVISION'
  | 'FAILED_REMEDIATION'
  | 'COMPLETED';
export type StrategyHint = {
  code: string;
  kind: 'external-framework-hint' | 'internal-desloop-focus';
  status: 'strategy-proposed';
};
export interface EnginePathway {
  mode: 'adult-draft-2';
  contentVersion: string;
  policyVersion: string;
  completedCount: number;
  currentCourseId: string | null;
  courses: {
    id: string;
    number: number;
    title: string;
    stage: string;
    state: EngineState;
    strategyHints: StrategyHint[];
  }[];
}
export interface EngineDetail {
  course: PilotCourseDetail['course'];
  state: EngineState;
  moduleStates: { id: string; state: EngineState }[];
  completedLessons: string[];
  guidedLessonId: string | null;
  guidedPassed: boolean;
  strategyHints: StrategyHint[];
  quiz: { score: number; criticalPassed: boolean; attemptedAt: string } | null;
  project: {
    id: string;
    status: 'submitted' | 'revision_requested' | 'approved';
    iteration: number;
    submittedAt: string;
    feedback: string | null;
  } | null;
}
export interface EngineReview {
  id: string;
  course_id: string;
  courseTitle: string;
  learner_name: string;
  artefact: string;
  reflection: string;
  iteration: number;
  submitted_at: string;
  rubricDimensions: string[];
}
export type VisualStep =
  | { kind: 'START' }
  | { kind: 'SAY'; text: string }
  | { kind: 'REPEAT'; count: number; text: string }
  | { kind: 'CHOICE'; prompt: string; yes: string; no: string };
export type VisualDocument = { format: 'desloop-visual-v1'; steps: VisualStep[] };
export type VisualFeedback = {
  passed: boolean;
  checks: { id: string; label: string; passed: boolean }[];
  trace: string[];
  runId: string;
  repeated: boolean;
};
export type StudioProject = {
  id: string;
  scope: 'GUIDED' | 'PLAYGROUND';
  toolKind: 'VISUAL';
  title: string;
  courseId: string | null;
  lessonId: string | null;
  latestRevision: number | null;
  passed: boolean | null;
  createdAt: string;
};
export interface StudioDetail {
  project: {
    id: string;
    title: string;
    scope: 'GUIDED' | 'PLAYGROUND';
    toolKind: 'VISUAL';
    courseId: string | null;
    lessonId: string | null;
    visibility: 'private';
  };
  latest: { revisionNo: number; document: VisualDocument; createdAt: string } | null;
  lastRun: {
    id: string;
    revision_no: number;
    passed: boolean;
    checks: { id: string; label: string; passed: boolean }[];
    created_at: string;
  } | null;
}
const base = '/engine';
export const engineApi = {
  pathway: () => pilotRequest<EnginePathway>(`${base}/pathway`),
  course: (id: string) => pilotRequest<EngineDetail>(`${base}/courses/${encodeURIComponent(id)}`),
  lesson: (
    course: string,
    lesson: string,
    practice: string,
    answerIndex: number,
    requestId: string,
  ) =>
    pilotRequest<{ completed: boolean; explanation: string | null; repeated: boolean }>(
      `${base}/courses/${encodeURIComponent(course)}/lessons/${encodeURIComponent(lesson)}`,
      { practice, answerIndex, requestId },
    ),
  quiz: (course: string, answers: number[], requestId: string) =>
    pilotRequest<{
      score: number;
      criticalPassed: boolean;
      passed: boolean;
      repeated: boolean;
      missed: { index: number; explanation: string; safetyCritical: boolean }[];
    }>(`${base}/courses/${encodeURIComponent(course)}/quiz`, { answers, requestId }),
  project: (
    course: string,
    body: { artefact: string; reflection: string; safetyAttested: true; requestId: string },
  ) =>
    pilotRequest<{ submissionId: string; status: string; repeated: boolean }>(
      `${base}/courses/${encodeURIComponent(course)}/project`,
      body,
    ),
  reviews: () => pilotRequest<{ queue: EngineReview[] }>(`${base}/reviews`),
  review: (
    id: string,
    body: {
      decision: 'approved' | 'revision_requested';
      rubric: Record<string, number>;
      feedback: string;
      safetyApproved: boolean;
      requestId: string;
    },
  ) =>
    pilotRequest<{
      repeated: boolean;
      completed: boolean;
      decision: string;
      projectScore: number;
      overallScore: number;
      nextCourseId: string | null;
    }>(`${base}/reviews/${encodeURIComponent(id)}`, body),
  projects: () => pilotRequest<{ projects: StudioProject[] }>(`${base}/studio`),
  create: (body: {
    scope: 'GUIDED' | 'PLAYGROUND';
    title: string;
    courseId?: string;
    lessonId?: string;
    requestId: string;
  }) =>
    pilotRequest<{ id: string; scope: 'GUIDED' | 'PLAYGROUND'; repeated: boolean }>(
      `${base}/studio`,
      body,
    ),
  studioProject: (id: string) =>
    pilotRequest<StudioDetail>(`${base}/studio/projects/${encodeURIComponent(id)}`),
  save: (id: string, document: VisualDocument, requestId: string) =>
    pilotRequest<{ revisionNo: number; repeated: boolean }>(
      `${base}/studio/projects/${encodeURIComponent(id)}/revisions`,
      { document, requestId },
    ),
  run: (id: string, revisionNo: number, requestId: string) =>
    pilotRequest<VisualFeedback>(`${base}/studio/projects/${encodeURIComponent(id)}/run`, {
      revisionNo,
      requestId,
    }),
  brief: (course: string, lesson: string) =>
    pilotRequest<{
      contentVersion: string;
      criteria: { title: string; prompt: string; checks: string[] };
      evaluatorVersion: string;
      note: string;
    }>(`${base}/studio/guided/${encodeURIComponent(course)}/${encodeURIComponent(lesson)}/brief`),
};

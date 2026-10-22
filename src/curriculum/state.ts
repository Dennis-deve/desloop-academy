import type { AgeBand } from './model';

export type ResponseMode = 'typed' | 'dictated-or-described';
export interface LessonWork {
  practice: string;
  mode: ResponseMode;
  completedAt: string;
  attempts: number;
  version: string;
  safetyPassed: boolean;
}
export interface QuizAttempt {
  answers: number[];
  score: number;
  criticalPassed: boolean;
  at: string;
  version: string;
}
export interface CourseEvidence {
  artefact: string;
  reflection: string;
  mode: ResponseMode;
  safetyChecked: boolean;
  status: 'submitted' | 'revision_requested';
  submittedAt: string;
  feedback?: string;
  version: string;
}
export interface ReviewScores {
  project: number;
  practice: number;
  reflection: number;
  safety: number;
  scope?: number;
  design?: number;
  technical?: number;
  testing?: number;
  presentation?: number;
}
export interface CompletionRecord {
  courseId: string;
  version: string;
  quizScore: number;
  projectScore: number;
  overallScore: number;
  practiceComplete: true;
  criticalPassed: true;
  humanReview: true;
  reviewer: string;
  completedAt: string;
}
export interface CurriculumProgress {
  band: AgeBand;
  lessonWork: Record<string, LessonWork>;
  lessonDrafts: Record<string, string>;
  lessonAttempts: Record<string, number>;
  quizzes: Record<string, QuizAttempt[]>;
  evidence: Record<string, CourseEvidence>;
  completions: Record<string, CompletionRecord>;
}
export const freshCurriculumProgress = (): CurriculumProgress => ({
  band: 'adult',
  lessonWork: {},
  lessonDrafts: {},
  lessonAttempts: {},
  quizzes: {},
  evidence: {},
  completions: {},
});

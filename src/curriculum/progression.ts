import { courseById, finalChecks, lessonsFor, masterCourses, type MasterCourse } from './model';
import type {
  CurriculumProgress,
  ReviewScores,
  ResponseMode,
  QuizAttempt,
  CourseEvidence,
} from './state';
export type { CurriculumProgress, ReviewScores, ResponseMode } from './state';

export const COURSE_POLICY = {
  quizMinimum: 80,
  projectMinimum: 70,
  evidenceMinimum: 40,
  reflectionMinimum: 20,
  practiceMinimum: 15,
} as const;

function isCompletedSelf(course: MasterCourse, progress: CurriculumProgress) {
  const record = progress.completions[course.id];
  const quiz = latestQuiz(course, progress);
  const evidence = progress.evidence[course.id];
  return Boolean(
    record &&
    record.courseId === course.id &&
    record.version === course.version &&
    record.quizScore >= COURSE_POLICY.quizMinimum &&
    record.projectScore >= COURSE_POLICY.projectMinimum &&
    record.practiceComplete === true &&
    record.criticalPassed === true &&
    record.humanReview === true &&
    typeof record.reviewer === 'string' &&
    record.reviewer.length > 0 &&
    allLessonsComplete(course, progress) &&
    quiz &&
    quiz.score >= COURSE_POLICY.quizMinimum &&
    quiz.criticalPassed &&
    evidence?.version === course.version &&
    evidence.status === 'submitted',
  );
}

/** A contiguous, version-matched prefix is the ONLY unlock source in the demo. */
export function completedPrefix(progress: CurriculumProgress): number {
  let count = 0;
  for (const course of masterCourses) {
    if (!isCompletedSelf(course, progress)) break;
    count += 1;
  }
  return count;
}
export type CourseState = 'locked' | 'current' | 'review' | 'revision' | 'completed';
export function courseState(course: MasterCourse, progress: CurriculumProgress): CourseState {
  const count = completedPrefix(progress);
  if (course.number <= count) return 'completed';
  if (course.number > count + 1) return 'locked';
  const evidence = progress.evidence[course.id];
  if (evidence?.version === course.version && evidence.status === 'revision_requested')
    return 'revision';
  if (evidence?.version === course.version && evidence.status === 'submitted') return 'review';
  const quiz = latestQuiz(course, progress);
  if (quiz && (quiz.score < COURSE_POLICY.quizMinimum || !quiz.criticalPassed)) return 'revision';
  return 'current';
}
export const lessonComplete = (
  course: MasterCourse,
  lessonId: string,
  progress: CurriculumProgress,
) => {
  const record = progress.lessonWork[lessonId];
  return Boolean(record?.completedAt && record.version === course.version && record.safetyPassed);
};
export const allLessonsComplete = (course: MasterCourse, progress: CurriculumProgress) =>
  lessonsFor(course).every((lesson) => lessonComplete(course, lesson.id, progress));
export const latestQuiz = (course: MasterCourse, progress: CurriculumProgress) => {
  const attempts = progress.quizzes[course.id] ?? [];
  return [...attempts].reverse().find((attempt) => attempt.version === course.version);
};
export const quizPassed = (course: MasterCourse, progress: CurriculumProgress) => {
  const attempt = latestQuiz(course, progress);
  return Boolean(attempt && attempt.score >= COURSE_POLICY.quizMinimum && attempt.criticalPassed);
};
export function lessonAvailable(
  course: MasterCourse,
  lessonId: string,
  progress: CurriculumProgress,
) {
  if (courseState(course, progress) === 'locked') return false;
  const lessons = lessonsFor(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 && (index === 0 || lessonComplete(course, lessons[index - 1].id, progress));
}
export function nextAction(course: MasterCourse, progress: CurriculumProgress) {
  const state = courseState(course, progress);
  if (state === 'locked') return { label: 'Locked · complete the previous course', href: null };
  if (state === 'completed')
    return { label: 'Course passed · view what comes next', href: '/app/courses' };
  const nextLesson = lessonsFor(course).find(
    (lesson) => !lessonComplete(course, lesson.id, progress),
  );
  if (nextLesson)
    return {
      label: `Continue: ${nextLesson.title}`,
      href: `/app/learn/${course.id}/${nextLesson.id}`,
    };
  if (state === 'review')
    return { label: 'Awaiting demo reviewer decision', href: `/app/assess/${course.id}` };
  if (state === 'revision')
    return { label: 'Revise and retry within this course', href: `/app/assess/${course.id}` };
  return { label: 'Take the knowledge check and submit project', href: `/app/assess/${course.id}` };
}

export function recordLesson(
  progress: CurriculumProgress,
  courseId: string,
  lessonId: string,
  practice: string,
  answer: number,
  mode: ResponseMode,
  at = new Date().toISOString(),
): CurriculumProgress {
  const course = courseById(courseId);
  if (
    !course ||
    !['current', 'revision'].includes(courseState(course, progress)) ||
    !lessonAvailable(course, lessonId, progress)
  )
    return progress;
  const lesson = lessonsFor(course).find((item) => item.id === lessonId)!;
  const attempts = (progress.lessonAttempts[lessonId] ?? 0) + 1;
  const next = {
    ...progress,
    lessonAttempts: { ...progress.lessonAttempts, [lessonId]: attempts },
    lessonDrafts: { ...progress.lessonDrafts, [lessonId]: practice.slice(0, 5000) },
  };
  if (practice.trim().length < COURSE_POLICY.practiceMinimum || answer !== lesson.check.correct)
    return next;
  return {
    ...next,
    lessonWork: {
      ...next.lessonWork,
      [lessonId]: {
        practice: practice.trim().slice(0, 5000),
        mode,
        completedAt: at,
        attempts,
        version: course.version,
        safetyPassed: true,
      },
    },
  };
}

export function recordQuiz(
  progress: CurriculumProgress,
  courseId: string,
  answers: number[],
  at = new Date().toISOString(),
): CurriculumProgress {
  const course = courseById(courseId);
  if (
    !course ||
    !allLessonsComplete(course, progress) ||
    ['locked', 'completed', 'review'].includes(courseState(course, progress))
  )
    return progress;
  const checks = finalChecks(course);
  if (
    answers.length !== checks.length ||
    answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 2)
  )
    return progress;
  const correct = checks.filter((check, index) => answers[index] === check.correct).length;
  const criticalPassed = checks.every(
    (check, index) => !check.safetyCritical || answers[index] === check.correct,
  );
  const attempt: QuizAttempt = {
    answers: [...answers],
    score: Math.round((correct / checks.length) * 100),
    criticalPassed,
    at,
    version: course.version,
  };
  return {
    ...progress,
    quizzes: {
      ...progress.quizzes,
      [courseId]: [...(progress.quizzes[courseId] ?? []), attempt].slice(-20),
    },
  };
}

export function submitProject(
  progress: CurriculumProgress,
  courseId: string,
  artefact: string,
  reflection: string,
  mode: ResponseMode,
  safetyChecked: boolean,
  at = new Date().toISOString(),
): CurriculumProgress {
  const course = courseById(courseId);
  if (
    !course ||
    !['current', 'revision'].includes(courseState(course, progress)) ||
    !allLessonsComplete(course, progress) ||
    !quizPassed(course, progress) ||
    !safetyChecked ||
    artefact.trim().length < COURSE_POLICY.evidenceMinimum ||
    reflection.trim().length < COURSE_POLICY.reflectionMinimum
  )
    return progress;
  return {
    ...progress,
    evidence: {
      ...progress.evidence,
      [courseId]: {
        artefact: artefact.trim().slice(0, 5000),
        reflection: reflection.trim().slice(0, 5000),
        mode,
        safetyChecked,
        status: 'submitted',
        submittedAt: at,
        version: course.version,
      },
    },
  };
}

export function rubricScore(course: MasterCourse, quizScore: number, scores: ReviewScores) {
  if (course.number === 44) {
    const capstone =
      (scores.scope ?? 0) * 0.1 +
      (scores.project ?? 0) * 0.25 +
      (scores.design ?? 0) * 0.15 +
      (scores.technical ?? 0) * 0.15 +
      (scores.testing ?? 0) * 0.15 +
      scores.safety * 0.1 +
      (scores.presentation ?? 0) * 0.1;
    return { project: Math.round(capstone), overall: Math.round(capstone) };
  }
  return {
    project: scores.project,
    overall: Math.round(
      quizScore * 0.2 +
        scores.practice * 0.2 +
        scores.project * 0.4 +
        scores.reflection * 0.1 +
        scores.safety * 0.1,
    ),
  };
}

export function requestRevision(
  progress: CurriculumProgress,
  courseId: string,
  feedback: string,
): CurriculumProgress {
  const course = courseById(courseId);
  if (!course || courseState(course, progress) !== 'review' || feedback.trim().length < 10)
    return progress;
  return {
    ...progress,
    evidence: {
      ...progress.evidence,
      [courseId]: {
        ...progress.evidence[courseId],
        status: 'revision_requested',
        feedback: feedback.trim().slice(0, 3000),
      },
    },
  };
}

/** Demo-only reviewer decision. In production this entire transition belongs on the server. */
export function reviewProject(
  progress: CurriculumProgress,
  courseId: string,
  scores: ReviewScores,
  safetyApproved: boolean,
  feedback: string,
  reviewerRole: 'facilitator' | 'classroom_teacher',
  at = new Date().toISOString(),
): CurriculumProgress {
  const course = courseById(courseId);
  if (!course || courseState(course, progress) !== 'review') return progress;
  const evidence = progress.evidence[courseId];
  const quiz = latestQuiz(course, progress);
  const values =
    course.number === 44
      ? [
          scores.scope,
          scores.project,
          scores.design,
          scores.technical,
          scores.testing,
          scores.safety,
          scores.presentation,
        ]
      : [scores.project, scores.practice, scores.reflection, scores.safety];
  if (
    !evidence ||
    !quizPassed(course, progress) ||
    !quiz ||
    !allLessonsComplete(course, progress) ||
    feedback.trim().length < 10 ||
    values.some(
      (value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100,
    )
  )
    return progress;
  const result = rubricScore(course, quiz.score, scores);
  const approved =
    safetyApproved &&
    scores.safety >= COURSE_POLICY.projectMinimum &&
    result.project >= COURSE_POLICY.projectMinimum &&
    result.overall >= COURSE_POLICY.projectMinimum;
  const nextEvidence: CourseEvidence = {
    ...evidence,
    status: approved ? 'submitted' : 'revision_requested',
    feedback: feedback.trim().slice(0, 3000),
  };
  if (!approved)
    return { ...progress, evidence: { ...progress.evidence, [courseId]: nextEvidence } };
  return {
    ...progress,
    evidence: { ...progress.evidence, [courseId]: nextEvidence },
    completions: {
      ...progress.completions,
      [courseId]: {
        courseId,
        version: course.version,
        quizScore: quiz.score,
        projectScore: result.project,
        overallScore: result.overall,
        practiceComplete: true,
        criticalPassed: true,
        humanReview: true,
        reviewer: `${reviewerRole === 'facilitator' ? 'Facilitator' : 'Classroom teacher'} · demo decision`,
        completedAt: at,
      },
    },
  };
}

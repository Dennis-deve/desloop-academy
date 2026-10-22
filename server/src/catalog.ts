import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const checkSchema = z.object({
  question: z.string().min(8),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct: z.number().int().min(0),
  explanation: z.string().min(1),
  safetyCritical: z.boolean(),
});
const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  explanation: z.string(),
  workedExample: z.string(),
  guidedPractice: z.string(),
  independentPractice: z.string(),
  check: checkSchema,
});
const courseSchema = z.object({
  id: z.string().regex(/^course-\d{2}$/),
  number: z.number().int().min(1).max(44),
  slug: z.string(),
  version: z.string(),
  stage: z.string(),
  title: z.string(),
  purpose: z.string(),
  safetyCritical: z.boolean(),
  reviewStatus: z.string(),
  project: z.object({ brief: z.string(), requiredEvidence: z.array(z.string()) }),
  modules: z
    .array(z.object({ id: z.string(), title: z.string(), lessons: z.array(lessonSchema).min(1) }))
    .min(1),
});
const masterSchema = z.object({
  version: z.string().min(1),
  stages: z.array(z.object({ number: z.number() })).length(9),
  courses: z.array(courseSchema).length(44),
});
export type PilotCourse = z.infer<typeof courseSchema>;
export type PilotCheck = z.infer<typeof checkSchema>;
export type PilotLesson = z.infer<typeof lessonSchema>;
export const POLICY_VERSION = 'internal-pilot-1';
export const POLICY = {
  quizMinimum: 80,
  projectMinimum: 70,
  practiceMinimum: 15,
  evidenceMinimum: 40,
  reflectionMinimum: 20,
} as const;

export function loadCatalog(file = resolve(process.cwd(), 'src/curriculum/master.json')) {
  const bytes = readFileSync(file);
  const parsed = masterSchema.parse(JSON.parse(bytes.toString('utf8')));
  const courseIds = new Set<string>();
  const lessonIds = new Set<string>();
  parsed.courses.forEach((course, index) => {
    if (
      course.number !== index + 1 ||
      course.id !== `course-${String(index + 1).padStart(2, '0')}` ||
      course.version !== parsed.version ||
      courseIds.has(course.id)
    )
      throw new Error(`Invalid required sequence at course ${index + 1}`);
    courseIds.add(course.id);
    for (const lesson of lessonsFor(course)) {
      if (lessonIds.has(lesson.id) || lesson.check.correct >= lesson.check.options.length)
        throw new Error(`Invalid lesson/check ${lesson.id}`);
      lessonIds.add(lesson.id);
    }
    if (lessonsFor(course).length !== 4) throw new Error(`Expected four lessons in ${course.id}`);
  });
  return {
    version: parsed.version,
    hash: createHash('sha256').update(bytes).digest('hex'),
    courses: parsed.courses,
    course: (id: string) => parsed.courses.find((item) => item.id === id),
  };
}
export type PilotCatalog = ReturnType<typeof loadCatalog>;
export const lessonsFor = (course: PilotCourse) =>
  course.modules.flatMap((module) => module.lessons);

/** Do not send the correct answer or explanations until a learner has attempted a check. */
export function visibleCourse(course: PilotCourse) {
  return {
    id: course.id,
    number: course.number,
    title: course.title,
    stage: course.stage,
    version: course.version,
    purpose: course.purpose,
    project: course.project,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      lessons: module.lessons.map(({ check, ...lesson }) => ({
        ...lesson,
        check: {
          question: check.question,
          options: check.options,
          safetyCritical: check.safetyCritical,
        },
      })),
    })),
    quiz: finalChecks(course).map(({ question, options, safetyCritical }) => ({
      question,
      options,
      safetyCritical,
    })),
  };
}

export function finalChecks(course: PilotCourse): PilotCheck[] {
  return [
    ...lessonsFor(course).map((lesson) => lesson.check),
    {
      question: `Before handing in your ${course.title.toLowerCase()} project, which check matters most?`,
      options: [
        'Review the artefact against the brief, test it, explain your own work and remove private details.',
        'Submit immediately without testing because a project only needs to look finished.',
        'Add personal contact information so others can verify that you made it.',
      ],
      correct: 0,
      explanation:
        'A safe submission shows your thinking and tests the work without disclosing private details.',
      safetyCritical: course.safetyCritical,
    },
  ];
}

export function scoreQuiz(course: PilotCourse, answers: number[]) {
  const checks = finalChecks(course);
  if (
    answers.length !== checks.length ||
    checks.some(
      (check, i) =>
        !Number.isInteger(answers[i]) || answers[i] < 0 || answers[i] >= check.options.length,
    )
  )
    throw new Error('Invalid quiz answers');
  const missed = checks.flatMap((check, index) =>
    answers[index] === check.correct
      ? []
      : [{ index, explanation: check.explanation, safetyCritical: check.safetyCritical }],
  );
  return {
    score: Math.round((100 * (checks.length - missed.length)) / checks.length),
    criticalPassed: !missed.some((item) => item.safetyCritical),
    missed,
  };
}

export type ReviewRubric = Record<string, number>;
export function scoreRubric(course: PilotCourse, quizScore: number, scores: ReviewRubric) {
  const keys =
    course.number === 44
      ? ['scope', 'project', 'design', 'technical', 'testing', 'safety', 'presentation']
      : ['project', 'practice', 'reflection', 'safety'];
  if (
    Object.keys(scores).length !== keys.length ||
    !keys.every((key) => Number.isInteger(scores[key]) && scores[key] >= 0 && scores[key] <= 100)
  )
    throw new Error('Invalid rubric dimensions');
  const project =
    course.number === 44
      ? Math.round(
          scores.scope * 0.1 +
            scores.project * 0.25 +
            scores.design * 0.15 +
            scores.technical * 0.15 +
            scores.testing * 0.15 +
            scores.safety * 0.1 +
            scores.presentation * 0.1,
        )
      : scores.project;
  const overall =
    course.number === 44
      ? project
      : Math.round(
          quizScore * 0.2 +
            scores.practice * 0.2 +
            project * 0.4 +
            scores.reflection * 0.1 +
            scores.safety * 0.1,
        );
  return { project, overall, safety: scores.safety };
}

/** Accept only the contiguous CURRENT-version prefix; a stale or forged client flag never unlocks. */
export function completedPrefix(
  catalog: PilotCatalog,
  rows: { course_id: string; version: string; policy_version: string }[],
) {
  const complete = new Set(
    rows
      .filter((row) => row.policy_version === POLICY_VERSION)
      .map((row) => `${row.course_id}:${row.version}`),
  );
  const firstMissing = catalog.courses.findIndex(
    (course) => !complete.has(`${course.id}:${course.version}`),
  );
  return firstMissing < 0 ? catalog.courses.length : firstMissing;
}

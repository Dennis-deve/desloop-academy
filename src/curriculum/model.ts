import master from './master.json';

export type AgeBand = 'early' | 'junior' | 'teen' | 'adult';
export const ageBands: { id: AgeBand; label: string }[] = [
  { id: 'early', label: 'Ages 6–8' },
  { id: 'junior', label: 'Ages 9–12' },
  { id: 'teen', label: 'Ages 13–17' },
  { id: 'adult', label: 'Ages 18+' },
];

export interface Check {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  safetyCritical: boolean;
}
export interface MasterLesson {
  id: string;
  title: string;
  minutes: number;
  objective: string;
  explanation: string;
  workedExample: string;
  guidedPractice: string;
  independentPractice: string;
  check: Check;
}
export interface MasterModule {
  id: string;
  title: string;
  focus: string;
  lessons: MasterLesson[];
}
export interface MasterCourse {
  id: string;
  number: number;
  slug: string;
  version: string;
  stage: string;
  title: string;
  purpose: string;
  guidedHours: number;
  outcomes: string[];
  project: { brief: string; requiredEvidence: string[] };
  assessment: string;
  ageAdaptation: Record<AgeBand, string>;
  safetyCritical: boolean;
  modules: MasterModule[];
  reviewStatus: string;
}
export interface MasterStage {
  number: number;
  title: string;
  subtitle: string;
  first: number;
  last: number;
}

// The included JSON is the single runtime source. The authoring seed regenerates it.
// It is DRAFT course-level content, not reviewed, accredited teaching material.
export const masterVersion = master.version;
export const masterStages: MasterStage[] = master.stages;
export const masterCourses: MasterCourse[] = master.courses;
export const courseById = (id: string) => masterCourses.find((course) => course.id === id);
export const courseBySlug = (slug: string) =>
  masterCourses.find((course) => course.slug === slug || course.id === slug);
export const lessonsFor = (course: MasterCourse) =>
  course.modules.flatMap((module) => module.lessons);
export const stageFor = (course: MasterCourse) =>
  masterStages.find((stage) => stage.title === course.stage)!;
export const nextCourse = (course: MasterCourse) => masterCourses[course.number] ?? null;

export function lessonScaffold(course: MasterCourse, lesson: MasterLesson, band: AgeBand): string {
  const context = master.scaffoldingContexts.find((item) => item.stage === course.stage)!;
  const focus = lesson.objective[0].toLowerCase() + lesson.objective.slice(1).replace(/\.$/, '');
  if (band === 'early')
    return `With a trusted adult, act out ${context.early}. First point to or name the part of the example about ${lesson.title.toLowerCase()}; next try one small step from the objective. Say what happened while the adult records your words or describes your drawing. Use no real names or public account.`;
  if (band === 'junior')
    return `Use a three-step checklist with an approved example: spot ${lesson.title.toLowerCase()}, try the focus skill, then compare the result to the objective. Describe one reason for your choice. Ask for a hint rather than giving away personal information.`;
  if (band === 'teen')
    return `Use a supervised practice tool and a fictional scenario. Plan how to ${focus}; make an attempt, test another case and document why one choice worked better. Keep any collaboration moderated.`;
  return `Apply this idea to ${context.adult}, never real private records. Define a goal for ${lesson.title.toLowerCase()}, practise the focus skill, test an edge case and document a practical trade-off before submitting.`;
}

/** A fifth scenario item makes the quiz threshold meaningful (4/5 = 80%). */
export function finalChecks(course: MasterCourse): Check[] {
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

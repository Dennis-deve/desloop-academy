import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { loadCatalog, type PilotCourse } from '../catalog.js';
import type { ToolKind } from './contracts.js';

export const ENGINE_POLICY_VERSION = 'blueprint-pilot-2';
export const ENGINE_POLICY = {
  quizMinimum: 80,
  projectMinimum: 70,
  practiceMinimum: 15,
  evidenceMinimum: 40,
  reflectionMinimum: 20,
} as const;
export const GUIDED_LESSON = {
  courseId: 'course-08',
  moduleId: 'c08-m2',
  lessonId: 'c08-l2',
} as const;
export const VISUAL_EVALUATOR_VERSION = 'visual-sequence-1';
export const VISUAL_CRITERIA = {
  title: 'Events and sequences: a fictional two-step story',
  prompt: 'Start a fictional story with an event, then put two different spoken actions in order.',
  checks: [
    'An event starts the sequence',
    'Two distinct spoken steps follow in order',
    'Every step uses safe, non-personal text',
  ],
} as const;

const tagSchema = z.object({
  code: z.enum(['GES_CCP', 'CAMBRIDGE_0860', 'OXFORD_INTL', 'VOCATIONAL_PRO']),
  kind: z.enum(['external-framework-hint', 'internal-desloop-focus']),
  status: z.literal('strategy-proposed'),
  displayAsVerifiedAlignment: z.literal(false),
  source: z.object({ document: z.literal('strategy'), page: z.literal(3) }),
});
const candidateSchema = z.object({
  version: z.literal('draft-2-candidate'),
  policyProposal: z.object({
    quizMinimumInclusive: z.literal(80),
    projectRubricMinimumInclusive: z.literal(70),
    allSafetyCriticalChecksMustPass: z.literal(true),
    humanProjectReviewRequired: z.literal(true),
  }),
  sourceDocuments: z.object({
    strategy: z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/) }),
  }),
  courses: z
    .array(
      z.object({
        id: z.string(),
        number: z.number(),
        strategyHints: z.array(tagSchema),
        modules: z.array(
          z.object({
            lessons: z.array(
              z.object({
                id: z.string(),
                sandboxProposal: z.object({ toolKind: z.string(), status: z.string() }).optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .length(44),
});
export type EngineCourse = PilotCourse;
export type StrategyHint = z.infer<typeof tagSchema>;
export interface EngineCatalog {
  version: string;
  hash: string;
  courses: EngineCourse[];
  course: (id: string) => EngineCourse | undefined;
  strategySha256: string;
  strategyTags: Map<string, StrategyHint[]>;
  toolPlacements: Map<string, ToolKind>;
}

export function loadEngineCatalog(
  file = resolve(process.cwd(), 'src/curriculum/candidates/master-draft-2.json'),
): EngineCatalog {
  // loadCatalog checks 44 ordered IDs, release versions, answer bounds and lesson uniqueness.
  const catalog = loadCatalog(file);
  const candidate = candidateSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  if (catalog.version !== candidate.version)
    throw new Error('Candidate release changed during load');
  const strategyTags = new Map<string, StrategyHint[]>();
  const toolPlacements = new Map<string, ToolKind>();
  let tagCount = 0;
  for (const course of candidate.courses) {
    if (course.id !== catalog.courses[course.number - 1]?.id)
      throw new Error('Candidate course IDs changed');
    strategyTags.set(course.id, course.strategyHints);
    tagCount += course.strategyHints.length;
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (lesson.sandboxProposal) {
          if (lesson.id === GUIDED_LESSON.lessonId && lesson.sandboxProposal.toolKind !== 'VISUAL')
            throw new Error('The guided visual lesson tool changed');
          toolPlacements.set(lesson.id, lesson.sandboxProposal.toolKind as ToolKind);
        }
      }
    }
  }
  if (tagCount !== 34 || toolPlacements.get(GUIDED_LESSON.lessonId) !== 'VISUAL')
    throw new Error('Candidate source tags or guided lesson mapping changed');
  return {
    version: catalog.version,
    hash: catalog.hash,
    courses: catalog.courses,
    course: catalog.course,
    strategySha256: candidate.sourceDocuments.strategy.sha256,
    strategyTags,
    toolPlacements,
  };
}
